import { api } from '@/lib/api';

export async function getPayroll(params: Record<string, string | number | boolean>) {
  const { data } = await api.get('/payroll', { params });
  return data.data;
}

export async function generatePayroll(payload: { month: number; year: number }) {
  const { data } = await api.post('/payroll/generate', payload);
  return data.data;
}

export async function lockPayroll(id: string) {
  const { data } = await api.put(`/payroll/${id}/lock`);
  return data.data;
}

export async function payPayroll(id: string) {
  const { data } = await api.put(`/payroll/${id}/pay`);
  return data.data;
}

export async function getPayrollById(id: string) {
  const { data } = await api.get(`/payroll/${id}`);
  return data.data;
}

export async function generatePayslip(id: string) {
  const { data } = await api.post(`/payroll/${id}/payslip`);
  return data.data;
}
