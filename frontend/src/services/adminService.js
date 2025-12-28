import api from './api';

export const adminService = {
  // Get dashboard stats
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Get all users
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // Get single user
  getUser: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  // Update user role
  updateUserRole: async (id, role) => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  // Toggle user status
  toggleUserStatus: async (id) => {
    const response = await api.put(`/admin/users/${id}/status`);
    return response.data;
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Get all videos
  getVideos: async (params = {}) => {
    const response = await api.get('/admin/videos', { params });
    return response.data;
  },

  // Delete video
  deleteVideo: async (id) => {
    const response = await api.delete(`/admin/videos/${id}`);
    return response.data;
  }
};

export default adminService;
