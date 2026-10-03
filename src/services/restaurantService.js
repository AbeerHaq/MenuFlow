import api from './api';

const restaurantService = {
  // Dashboard numbers: todayOrders, pendingOrders, todayRevenue, monthlyOrders
  getDashboardStats: async () => {
    const response = await api.get('/restaurant/dashboard-stats');
    return response.data;
  },

  // Restaurant profile: name, address, phone, email, description
  getProfile: async () => {
    const response = await api.get('/restaurant/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/restaurant/profile', profileData);
    return response.data;
  },
};

export default restaurantService;
