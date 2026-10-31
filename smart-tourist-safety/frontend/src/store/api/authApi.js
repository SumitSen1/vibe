import axios from 'axios';

// Backend URL resolution:
// 1. Explicit VITE_API_URL if set in environment
// 2. Production fallback to Render backend
// 3. In dev mode without VITE_API_URL, empty string (so Vite dev proxy forwards /api to localhost:5000)
const rawApiUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? 'https://vibe-4pwu.onrender.com' : '');
export const BACKEND_URL = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';
export const AUTH_BASE_URL = BACKEND_URL ? `${BACKEND_URL}/api/auth` : '/api/auth';

// ── Axios Instance ─────────────────────────────────────────────────
const authAxios = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000, // 60s to accommodate Render free tier cold starts
});

// We store a reference to the store getter to avoid circular imports.
// It's set by the store itself after creation.
let getStoreState = null;

/**
 * Called by authStore.js after the store is created to wire up the
 * interceptors without a circular import.
 */
export function setStoreAccessor(accessor) {
  getStoreState = accessor;
}

// ── Request Interceptor ────────────────────────────────────────────
// Reads the token from the Zustand store (single source of truth).
authAxios.interceptors.request.use((config) => {
  if (getStoreState) {
    const { token } = getStoreState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response Interceptor ───────────────────────────────────────────
// Auto-logout on 401 so stale tokens don't leave the user in limbo.
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getStoreState) {
      const state = getStoreState();
      // Only force-logout if the user thought they were authenticated.
      if (state.token) {
        state._logout();
      }
    }
    return Promise.reject(error);
  }
);

// ── Error Normalizer ───────────────────────────────────────────────
function normalizeError(error) {
  if (error.response?.data) {
    const { message, errors } = error.response.data;
    if (errors?.length) return errors.map((e) => e.message || e.msg).join(' • ');
    if (message) return message;
  }
  if (error.code === 'ECONNABORTED') return 'Request timed out. Please check your connection.';
  return 'Network error. Please try again.';
}

// ── API Functions ──────────────────────────────────────────────────

export async function loginApi(credentials) {
  try {
    const { data } = await authAxios.post('/login', credentials);
    return data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

export async function registerApi(userData) {
  try {
    const { data } = await authAxios.post('/register', userData);
    return data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

export async function getMeApi() {
  try {
    const { data } = await authAxios.get('/me');
    return data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

export async function logoutApi() {
  try {
    await authAxios.post('/logout');
  } catch {
    // Silent — we clear local state regardless.
  }
}
