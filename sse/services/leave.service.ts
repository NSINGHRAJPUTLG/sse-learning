import { api } from '@/lib/api';

export async function getLeaveTypes() {
  const { data } = await api.get('/leaves/types');
  return data.data;
}

export async function applyLeave(payload: Record<string, unknown>) {
  const { data } = await api.post('/leaves/apply', payload);
  return data.data;
}

export async function approveLeave(id: string) {
  const { data } = await api.put(`/leaves/${id}/approve`);
  return data.data;
}

export async function rejectLeave(id: string) {
  const { data } = await api.put(`/leaves/${id}/reject`);
  return data.data;
}

export async function cancelLeave(id: string) {
  const { data } = await api.put(`/leaves/${id}/cancel`);
  return data.data;
}

export async function getLeaves(params: Record<string, string | number | boolean>) {
  const { data } = await api.get('/leaves', { params });
  return data.data;
}

export async function getLeaveCalendar(month: number, year: number) {
  const { data } = await api.get('/leaves/calendar', { params: { month, year } });
  return data.data;
}
