import axios from 'axios';
import { mockAdapter } from './mockApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Demo mode: set VITE_USE_MOCK=false in .env to talk to a real backend
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// One shared axios instance for the whole app
const api = axios.create({
  baseURL: API_URL,
  ...(USE_MOCK ? { adapter: mockAdapter } : {}),
});

// Attach the JWT token (saved by AuthContext as "menuflow_token") to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('menuflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
