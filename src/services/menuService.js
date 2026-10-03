import api from './api';

const menuService = {
  // Categories
  getCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Menu Items
  getMenuItems: async () => {
    const response = await api.get('/menu-items');
    return response.data;
  },

  createMenuItem: async (itemData) => {
    const response = await api.post('/menu-items', itemData);
    return response.data;
  },

  updateMenuItem: async (id, itemData) => {
    const response = await api.put(`/menu-items/${id}`, itemData);
    return response.data;
  },

  deleteMenuItem: async (id) => {
    const response = await api.delete(`/menu-items/${id}`);
    return response.data;
  },
};

export default menuService;