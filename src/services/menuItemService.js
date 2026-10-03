import api from './api';

const menuItemService = {
  // Get all menu items of the logged-in owner
  getAll: async () => {
    const response = await api.get('/menu-items');
    return response.data;
  },

  // Create a menu item. `formData` is a FormData object (it contains the image file),
  // axios sets the multipart header automatically.
  create: async (formData) => {
    const response = await api.post('/menu-items', formData);
    return response.data;
  },

  // Update a menu item (FormData as well)
  update: async (id, formData) => {
    const response = await api.put(`/menu-items/${id}`, formData);
    return response.data;
  },

  // Delete a menu item
  delete: async (id) => {
    const response = await api.delete(`/menu-items/${id}`);
    return response.data;
  },

  // Quickly switch an item between Available / Unavailable
  toggleAvailability: async (id, isAvailable) => {
    const response = await api.patch(`/menu-items/${id}/availability`, { isAvailable });
    return response.data;
  },
};

export default menuItemService;
