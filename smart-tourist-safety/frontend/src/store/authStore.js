import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  loginApi,
  registerApi,
  logoutApi,
  getMeApi,
  setStoreAccessor,
} from './api/authApi';

// ── Auth Store ─────────────────────────────────────────────────────
// Single source of truth for authentication state.
// Uses Zustand's `persist` middleware with a unified localStorage key
// (`auth-storage`) to eliminate the old token-key mismatch bug.

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────────
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Actions ──────────────────────────────────────────────────

      /**
       * Log in with { username, password }.
       * On success, stores the JWT and user info.
       */
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const data = await loginApi(credentials);
          if (data.success) {
            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return { success: true };
          }
          set({ isLoading: false, error: data.message || 'Login failed.' });
          return { success: false, message: data.message };
        } catch (err) {
          const message = err.message || 'Login failed. Please try again.';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      /**
       * Register a new user.
       * Does NOT auto-login — the user is redirected to the login page.
       */
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const data = await registerApi(userData);
          set({ isLoading: false, error: null });
          if (data.success) {
            return { success: true, message: data.message };
          }
          set({ error: data.message || 'Registration failed.' });
          return { success: false, message: data.message };
        } catch (err) {
          const message = err.message || 'Registration failed. Please try again.';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      /**
       * Log out — clears local state and notifies the backend.
       */
      logout: async () => {
        await logoutApi();
        get()._logout();
      },

      /**
       * Internal logout (no API call). Used by the 401 interceptor
       * to avoid infinite loops.
       */
      _logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        // Clean up any legacy keys from the old system
        localStorage.removeItem('token');
        localStorage.removeItem('st_token');
        localStorage.removeItem('st_user');
      },

      /**
       * Hydrate — validate the stored token by calling GET /me.
       * Called once on app mount.
       */
      hydrate: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }
        set({ isLoading: true });
        try {
          const data = await getMeApi();
          if (data.success && data.user) {
            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            get()._logout();
          }
        } catch {
          // Token invalid/expired — clear everything.
          get()._logout();
        }
      },

      /**
       * Reset error state (e.g. when the user starts typing again).
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage', // single localStorage key
      partialize: (state) => ({
        // Only persist token and user — not transient UI state.
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Wire up the store accessor for the axios interceptors.
// This runs once at module-load time, after the store is created.
setStoreAccessor(() => useAuthStore.getState());
