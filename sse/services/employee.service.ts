import { api } from '@/lib/api';
import type { ApiEnvelope, Paginated } from '@/types/api';

export type Employee = {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation?: string;
  status: string;
  employmentType: string;
  userId?: { email: string; role: string };
};

export async function getEmployees(params: Record<string, string | number | boolean>) {
  const { data } = await api.get<ApiEnvelope<Paginated<Employee>>>('/employees', { params });
  return data.data;
}

export async function createEmployee(payload: Record<string, unknown>) {
  const { data } = await api.post('/employees', payload);
  return data.data;
}

export async function getEmployeeById(id: string) {
  const { data } = await api.get(`/employees/${id}`);
  return data.data;
}

export async function updateEmployee(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`/employees/${id}`, payload);
  return data.data;
}

export async function deleteEmployee(id: string) {
  const { data } = await api.delete(`/employees/${id}`);
  return data.data;
}
