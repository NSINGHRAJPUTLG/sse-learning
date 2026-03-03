import { api } from '@/lib/api';
import type { ApiEnvelope } from '@/types/api';

export type LoginPayload = {
  companyId: string;
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
};

export async function login(payload: LoginPayload) {
  const { data } = await api.post<ApiEnvelope<LoginResponse>>('/auth/login', payload);
  return data.data;
}

export async function register(payload: {
  companyId: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN';
}) {
  const { data } = await api.post('/auth/register', payload);
  return data.data;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function me() {
  const { data } = await api.get('/auth/me');
  return data.data;
}
