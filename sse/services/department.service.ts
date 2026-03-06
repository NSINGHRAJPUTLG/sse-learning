import { api } from '@/lib/api';
import type { ApiEnvelope, Paginated } from '@/types/api';

export type DepartmentManager = {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation?: string;
};

export type DepartmentParent = {
  _id: string;
  name: string;
  isActive: boolean;
};

export type Department = {
  _id: string;
  name: string;
  description?: string;
  managerId?: string | DepartmentManager | null;
  parentDepartmentId?: string | DepartmentParent | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DepartmentTreeNode = Department & {
  children: DepartmentTreeNode[];
};

export type DepartmentListResponse = Paginated<Department> & {
  tree?: DepartmentTreeNode[];
};

export type DepartmentStats = {
  totalEmployees: number;
  activeEmployees: number;
  managersCount: number;
};

export type DepartmentPayload = {
  name?: string;
  description?: string;
  managerId?: string;
  parentDepartmentId?: string | null;
  isActive?: boolean;
};

export async function getDepartments(params: Record<string, string | number | boolean>) {
  const { data } = await api.get<ApiEnvelope<DepartmentListResponse>>('/departments', { params });
  return data.data;
}

export async function getDepartmentById(id: string) {
  const { data } = await api.get<ApiEnvelope<Department>>(`/departments/${id}`);
  return data.data;
}

export async function createDepartment(payload: DepartmentPayload) {
  const { data } = await api.post<ApiEnvelope<Department>>('/departments', payload);
  return data.data;
}

export async function updateDepartment(id: string, payload: DepartmentPayload) {
  const { data } = await api.put<ApiEnvelope<Department>>(`/departments/${id}`, payload);
  return data.data;
}

export async function deleteDepartment(id: string) {
  const { data } = await api.delete<ApiEnvelope<Department>>(`/departments/${id}`);
  return data.data;
}

export async function getDepartmentStats(id: string) {
  const { data } = await api.get<ApiEnvelope<DepartmentStats>>(`/departments/${id}/stats`);
  return data.data;
}
