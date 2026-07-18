import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — auto-attach JWT
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch {}
    }
  }
  return config;
});

// Response interceptor — unwrap { data } and handle errors
apiClient.interceptors.response.use(
  (response) => response.data.data,
  (error) => {
    const apiError = error.response?.data?.error || { code: 'NETWORK_ERROR', message: error.message };
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(apiError);
  },
);
