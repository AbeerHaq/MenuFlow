import api from './api';

const restaurantService = {
  getProfile: async () => {
    return await api.get('/owner/restaurant');
  },

  updateProfile: async (data) => {
    return await api.put('/owner/restaurant', data);
  },

  getDashboardStats: async () => {
    return await api.get('/owner/stats');
  },

  uploadImage: async (formData) => {
    return await api.post('/owner/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default restaurantService;
