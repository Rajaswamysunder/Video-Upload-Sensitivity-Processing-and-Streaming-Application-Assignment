import api from './api';

export const videoService = {
  // Get all videos with optional filters
  getVideos: async (params = {}) => {
    const response = await api.get('/videos', { params });
    return response.data;
  },

  // Get single video
  getVideo: async (id) => {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },

  // Upload video with progress tracking
  uploadVideo: async (formData, onProgress) => {
    const response = await api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) {
          onProgress(percentCompleted);
        }
      }
    });
    return response.data;
  },

  // Update video
  updateVideo: async (id, data) => {
    const response = await api.put(`/videos/${id}`, data);
    return response.data;
  },

  // Delete video
  deleteVideo: async (id) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },

  // Get video processing status
  getVideoStatus: async (id) => {
    const response = await api.get(`/videos/${id}/status`);
    return response.data;
  },

  // Get stream URL
  getStreamUrl: (id) => {
    const token = localStorage.getItem('token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stream/${id}?token=${token}`;
  },

  // Analyze video from URL for sensitivity
  analyzeUrl: async (url) => {
    const response = await api.post('/videos/analyze-url', { url });
    return response.data;
  },

  // Import video from external URL
  importFromUrl: async (data) => {
    const response = await api.post('/videos/import-url', data);
    return response.data;
  },

  // Search videos
  searchVideos: async (query) => {
    const response = await api.get('/videos/search', { params: { q: query } });
    return response.data;
  },

  // Like/Unlike video
  toggleLike: async (id) => {
    const response = await api.post(`/videos/${id}/like`);
    return response.data;
  },

  // Get download URL
  getDownloadUrl: (id) => {
    const token = localStorage.getItem('token');
    return `http://localhost:5000/api/stream/${id}?token=${token}&download=true`;
  }
};

export default videoService;
