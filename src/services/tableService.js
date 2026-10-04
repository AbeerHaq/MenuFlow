import api from './api';

const tableService = {
  getAll: async () => {
    return await api.get('/owner/tables');
  },

  create: async (data) => {
    return await api.post('/owner/tables', data);
  },

  update: async (id, data) => {
    return await api.put(`/owner/tables/${id}`, data);
  },

  delete: async (id) => {
    return await api.delete(`/owner/tables/${id}`);
  },

  regenerateQr: async (id) => {
    return await api.post(`/owner/tables/${id}/regenerate-qr`);
  },

  getQrData: async (id) => {
    return await api.get(`/owner/tables/${id}/qr`);
  },
};

export default tableService;