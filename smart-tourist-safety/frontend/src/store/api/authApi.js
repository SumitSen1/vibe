import axios from 'axios';

// ── Axios Instance ─────────────────────────────────────────────────
// Uses relative URL so Vite's dev proxy forwards to the backend.
// In production, configure your reverse proxy (nginx, etc.) similarly.
const authAxios = axios.create({
  baseURL: '/api/auth',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
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
