import api from './api';

const publicService = {
  getMenuByQrToken: async (slug, token) => {
    return await api.get(`/public/menu/${slug}/${token}`);
  },

  placeOrder: async (orderData) => {
    return await api.post('/public/orders', orderData);
  },

  getOrderById: async (orderId) => {
    return await api.get(`/public/orders/${orderId}`);
  },
};

export default publicService;
