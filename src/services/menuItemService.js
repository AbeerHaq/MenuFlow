import api from './api';

const menuItemService = {
  getAll: async (categoryId = '') => {
    const url = categoryId ? `/owner/menu-items?categoryId=${categoryId}` : '/owner/menu-items';
    return await api.get(url);
  },

  create: async (data) => {
    // If data is FormData, send with multipart/form-data header
    if (data instanceof FormData) {
      // If FormData contains an image file, upload image first
      const imageFile = data.get('image');
      let imageUrl = '';
      if (imageFile && imageFile instanceof File && imageFile.size > 0) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await api.post('/owner/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (uploadRes.success && uploadRes.url) {
          imageUrl = uploadRes.url;
        }
      }

      const payload = {
        name: data.get('name'),
        description: data.get('description'),
        price: Number(data.get('price')),
        categoryId: data.get('categoryId'),
        imageUrl: imageUrl,
        isAvailable: data.get('isAvailable') === 'true' || data.get('isAvailable') === true,
      };

      return await api.post('/owner/menu-items', payload);
    }

    return await api.post('/owner/menu-items', data);
  },

  update: async (id, data) => {
    if (data instanceof FormData) {
      const imageFile = data.get('image');
      let imageUrl = undefined;
      if (imageFile && imageFile instanceof File && imageFile.size > 0) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await api.post('/owner/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (uploadRes.success && uploadRes.url) {
          imageUrl = uploadRes.url;
        }
      }

      const payload = {
        name: data.get('name'),
        description: data.get('description'),
        price: Number(data.get('price')),
        categoryId: data.get('categoryId'),
        ...(imageUrl ? { imageUrl } : {}),
        isAvailable: data.get('isAvailable') === 'true' || data.get('isAvailable') === true,
      };

      return await api.put(`/owner/menu-items/${id}`, payload);
    }

    return await api.put(`/owner/menu-items/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/owner/menu-items/${id}`);
  },

  toggleAvailability: async (id, isAvailable) => {
    return await api.patch(`/owner/menu-items/${id}/availability`, { isAvailable });
  },
};

export default menuItemService;
