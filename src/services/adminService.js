import api from './api';

const adminService = {
  getRestaurants: async (search = '', status = 'all') => {
    let url = `/admin/restaurants?status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return await api.get(url);
  },

  updateRestaurantStatus: async (restaurantId, status) => {
    return await api.patch(`/admin/restaurants/${restaurantId}/status`, { status });
  },

  deleteRestaurant: async (restaurantId) => {
    return await api.delete(`/admin/restaurants/${restaurantId}`);
  },

  getRevenueAnalytics: async (days = 30) => {
    return await api.get(`/admin/analytics/revenue?days=${days}`);
  },
};

export default adminService;
