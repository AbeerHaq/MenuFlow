import api from './api';

const authService = {
  login: async (credentials) => {
    return await api.post('/auth/login', credentials);
  },

  register: async (userData) => {
    return await api.post('/auth/register', userData);
  },

  getMe: async () => {
    return await api.get('/auth/me');
  },

  forgotPassword: async (data) => {
    return await api.post('/auth/forgot-password', data);
  },

  resetPassword: async (data) => {
    return await api.post('/auth/reset-password', data);
  },
};

export default authService;