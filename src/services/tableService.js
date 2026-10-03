import api from './api';

const tableService = {
  // Get all tables for the logged-in owner
  getAll: async () => {
    const response = await api.get('/tables');
    return response.data;
  },

  // Create a new table
  create: async (tableData) => {
    const response = await api.post('/tables', tableData);
    return response.data;
  },

  // Update table details
  update: async (id, tableData) => {
    const response = await api.put(`/tables/${id}`, tableData);
    return response.data;
  },

  // Delete a table
  delete: async (id) => {
    const response = await api.delete(`/tables/${id}`);
    return response.data;
  },

  // Fetch table and menu info for customer view via QR code / table ID
  getByQrCode: async (tableId) => {
    const response = await api.get(`/tables/public/${tableId}`);
    return response.data;
  },
};

export default tableService;