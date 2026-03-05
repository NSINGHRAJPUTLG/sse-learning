import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.nsrgfx.in/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const refreshClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = (error.config || {}) as any;

    if (error?.response?.status === 401 && !original?._retry) {
      original._retry = true;
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const response = await refreshClient.post('/auth/refresh', { refreshToken });
          const nextToken = response.data?.data?.accessToken;
          if (nextToken) {
            setAccessToken(nextToken);
            original.headers.Authorization = `Bearer ${nextToken}`;
            return api(original);
          }
        } catch {
          // fallback to logout
        }
      }

      logout();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);
