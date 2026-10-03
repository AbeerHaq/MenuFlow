import api from './api';

const categoryService = {
  // Get all categories of the logged-in owner
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  // Create a category -> { name }
  create: async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  // Rename a category -> { name }
  update: async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  // Delete a category
  delete: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

export default categoryService;
