// API service — axios instance with JWT auth interceptor
import axios from 'axios';

// Base URL of our backend API
const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Handle 401 errors globally (token expired / invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth API ─────────────────────────────────────────────
export const authAPI = {
  signup:        (data) => api.post('/auth/signup', data),
  login:         (data) => api.post('/auth/login', data),
  getProfile:    ()     => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ── Food API ─────────────────────────────────────────────
export const foodAPI = {
  detectFood:    (foodName) => api.post('/food/detect', { foodName }),
  addFoodLog:    (data)     => api.post('/food/log', data),
  getTodayLog:   ()         => api.get('/food/log'),
  getWeeklyData: ()         => api.get('/food/weekly'),
  deleteFoodLog: (id)       => api.delete(`/food/log/${id}`),
};

// ── Diet API ─────────────────────────────────────────────
export const dietAPI = {
  getRecommendation: () => api.get('/diet/recommendation'),
};

// ── Weight API ───────────────────────────────────────────
export const weightAPI = {
  addWeight:        (data) => api.post('/weight', data),
  getWeightHistory: ()     => api.get('/weight'),
  deleteWeight:     (id)   => api.delete(`/weight/${id}`),
};

export default api;
