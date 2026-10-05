// API service — axios instance with JWT auth interceptor and token rotation
import axios from 'axios';

// Base URL of our backend API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // Supports HttpOnly refresh token cookies
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Handle 401 errors globally with automated refresh token rotation
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and if we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login') && !originalRequest.url.includes('/auth/refresh')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
        const newToken = res.data.token || res.data.accessToken;

        localStorage.setItem('token', newToken);
        if (res.data.refreshToken) {
          localStorage.setItem('refreshToken', res.data.refreshToken);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth API ─────────────────────────────────────────────
export const authAPI = {
  signup:        (data) => api.post('/auth/signup', data),
  login:         (data) => api.post('/auth/login', data),
  logout:        ()     => api.post('/auth/logout'),
  refreshToken:  ()     => api.post('/auth/refresh'),
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

// ── AI Engine API ────────────────────────────────────────
export const aiAPI = {
  scanFoodImage: (data)     => api.post('/ai/scan-food', data),
  chat:          (data)     => api.post('/ai/chat', data),
  lookupBarcode: (barcode)  => api.get(`/ai/barcode/${barcode}`),
};

// ── Diet API ─────────────────────────────────────────────
export const dietAPI = {
  getRecommendation: (style) => api.get('/diet/recommendation', { params: style ? { style } : undefined }),
  getStyles: () => api.get('/diet/styles'),
};

// ── Weight API ───────────────────────────────────────────
export const weightAPI = {
  addWeight:        (data) => api.post('/weight', data),
  getWeightHistory: ()     => api.get('/weight'),
  deleteWeight:     (id)   => api.delete(`/weight/${id}`),
};

export default api;
