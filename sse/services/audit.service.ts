import { api } from '@/lib/api';

export async function getAuditLogs(params?: Record<string, string | number>) {
  const { data } = await api.get('/audit', { params });
  return data.data;
}

export async function getMyActivity(params?: Record<string, string | number>) {
  const { data } = await api.get('/audit/my-activity', { params });
  return data.data;
}
