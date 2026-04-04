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
  login: (data) => api.post('/auth/login', { 
    ...data, 
    email: data.email?.toLowerCase().trim() 
  }),
  signup: (data) => api.post('/auth/signup', { 
    ...data, 
    email: data.email?.toLowerCase().trim() 
  }),
  getMe: () => api.get('/auth/me'),
  updateAvatar: (formData) => api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const userService = {
  getProfile: (id) => api.get(`/profile/${id}`),
  updateProfile: (data) => api.put('/profile', data),
  getSkillsList: () => api.get('/profile/skills-list'),
  addSkills: (skills) => api.post('/profile/skills', { skills }),
};

export const connectionService = {
  getConnections: (userId) => api.get(`/connections/${userId}`),
  sendRequest: (targetUserId) => api.post('/connections/request', { targetUserId }),
  acceptRequest: (id) => api.put(`/connections/${id}/accept`),
  declineRequest: (id) => api.put(`/connections/${id}/decline`),
  deleteConnection: (id) => api.delete(`/connections/${id}`),
};

export const postService = {
  getFeed: () => api.get('/posts'),
  createPost: (formData) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  likePost: (id) => api.post(`/posts/${id}/like`),
  addComment: (id, text) => api.post(`/posts/${id}/comments`, { text }),
  getComments: (id) => api.get(`/posts/${id}/comments`),
};

export const discoveryService = {
  getSuggestions: () => api.get('/discover/suggestions'),
  search: (q) => api.get(`/discover/search?q=${q}`),
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
