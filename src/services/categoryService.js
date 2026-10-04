import api from './api';

const categoryService = {
  getAll: async () => {
    return await api.get('/owner/categories');
  },

  create: async (data) => {
    return await api.post('/owner/categories', data);
  },

  update: async (id, data) => {
    return await api.put(`/owner/categories/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/owner/categories/${id}`);
  },

  reorder: async (orders) => {
    return await api.put('/owner/categories/reorder', { orders });
  },
};

export default categoryService;
