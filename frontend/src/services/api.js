import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Using /api prefix to avoid routing conflicts
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (data) => api.post('/auth/login', { ...data, email: data.email?.toLowerCase().trim() }),
  signup: (data) => api.post('/auth/signup', { ...data, email: data.email?.toLowerCase().trim() }),
  sendOtp: (email) => api.post('/auth/send-otp', { email: email.toLowerCase().trim() }),
  verifyOtp: (email, code) => api.post('/auth/verify-otp', { email: email.toLowerCase().trim(), code }),
  verifyEmail: (email, code) => api.post('/auth/verify-email', { email: email.toLowerCase().trim(), code }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email: email.toLowerCase().trim() }),
  resetPassword: (email, code, newPassword) => api.post('/auth/reset-password', { email: email.toLowerCase().trim(), code, newPassword }),
  getMe: () => api.get('/auth/me'),
  updateAvatar: (formData) => api.post('/upload/avatar', formData),
};

export const userService = {
  getProfile: (id) => api.get(`/profile/${id}`),
  updateProfile: (data) => api.put('/profile', data),
  getSkillsList: () => api.get('/profile/skills-list'),
  addSkills: (skills) => api.post('/profile/skills', { skills }),
};

export const connectionService = {
  getConnections: (userId, page = 1, limit = 10) => api.get(`/connections/${userId}`, { params: { page, limit } }),
  sendRequest: (targetUserId) => api.post('/connections/request', { targetUserId }),
  acceptRequest: (id) => api.put(`/connections/${id}/accept`),
  declineRequest: (id) => api.put(`/connections/${id}/decline`),
  deleteConnection: (id) => api.delete(`/connections/${id}`),
};

export const postService = {
  getFeed: (page = 1, limit = 10) => api.get('/posts', { params: { page, limit } }),
  createPost: (formData) => api.post('/posts', formData),
  likePost: (id) => api.post(`/posts/${id}/like`),
  addComment: (id, text) => api.post(`/posts/${id}/comments`, { text }),
  getComments: (id) => api.get(`/posts/${id}/comments`),
};

export const discoveryService = {
  getSuggestions: (page = 1, limit = 20) => api.get('/discover/suggestions', { params: { page, limit } }),
  search: (q, page = 1, limit = 10) => api.get(`/discover/search`, { params: { q, page, limit } }),
  discover: (params) => api.get('/discover', { params }),
};

export const chatService = {
  listConversations: () => api.get('/conversations'),
  getMessages: (id) => api.get(`/conversations/${id}/messages`),
  createConversation: (participantIds) => api.post('/conversations', { participantIds }),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: () => api.post('/notifications/read'),
};

export default api;
