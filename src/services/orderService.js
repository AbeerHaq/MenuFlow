import api from './api';

const orderService = {
  getAll: async (status = '') => {
    const url = status ? `/owner/orders?status=${status}` : '/owner/orders';
    return await api.get(url);
  },

  updateStatus: async (orderId, status, note = '') => {
    return await api.patch(`/owner/orders/${orderId}/status`, { status, note });
  },
};

export default orderService;
