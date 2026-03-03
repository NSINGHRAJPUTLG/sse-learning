import { api } from '@/lib/api';

export async function getNotifications(params?: Record<string, string | number | boolean>) {
  const { data } = await api.get('/notifications', { params });
  return data.data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data.data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.put('/notifications/read-all');
  return data.data;
}
