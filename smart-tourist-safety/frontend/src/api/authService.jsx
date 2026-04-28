import axios from 'axios';

const API = axios.create({
  baseURL: '/api/auth',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('st_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unified error normalizer
const handleError = (error) => {
  if (error.response?.data) {
    const { message, errors } = error.response.data;
    if (errors?.length) throw new Error(errors.map((e) => e.message).join(' • '));
    if (message) throw new Error(message);
  }
  if (error.code === 'ECONNABORTED') throw new Error('Request timed out. Please check your connection.');
  throw new Error('Network error. Please try again.');
};

export const loginUser = async (credentials) => {
  try {
    const { data } = await API.post('/login', credentials);
    return data;
  } catch (err) { handleError(err); }
};

export const registerUser = async (userData) => {
  try {
    const { data } = await API.post('/register', userData);
    return data;
  } catch (err) { handleError(err); }
};

export const getMe = async () => {
  try {
    const { data } = await API.get('/me');
    return data;
  } catch (err) { handleError(err); }
};

export const logoutUser = async () => {
  try {
    await API.post('/logout');
  } catch { /* silent */ }
};