import { api } from '@/lib/api';

export async function checkIn(payload?: { location?: string }) {
  const { data } = await api.post('/attendance/check-in', payload || {});
  return data.data;
}

export async function checkOut(payload?: { location?: string }) {
  const { data } = await api.post('/attendance/check-out', payload || {});
  return data.data;
}

export async function getAttendance(params: Record<string, string | number | boolean>) {
  const { data } = await api.get('/attendance', { params });
  return data.data;
}

export async function getAttendanceSummary(params?: Record<string, string | number>) {
  const { data } = await api.get('/attendance/summary', { params });
  return data.data;
}
