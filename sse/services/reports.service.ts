import { api } from '@/lib/api';

export async function getEmployeeStats(params?: Record<string, string | number>) {
  const { data } = await api.get('/reports/employee-stats', { params });
  return data.data;
}

export async function getAttendanceSummary(params?: Record<string, string | number>) {
  const { data } = await api.get('/reports/attendance-summary', { params });
  return data.data;
}

export async function getLeaveSummary(params?: Record<string, string | number>) {
  const { data } = await api.get('/reports/leave-summary', { params });
  return data.data;
}

export async function getPayrollSummary(params?: Record<string, string | number>) {
  const { data } = await api.get('/reports/payroll-summary', { params });
  return data.data;
}

export async function getAttrition(params?: Record<string, string | number>) {
  const { data } = await api.get('/reports/attrition', { params });
  return data.data;
}

export async function getDashboard(params?: Record<string, string | number>) {
  const { data } = await api.get('/reports/dashboard', { params });
  return data.data;
}
