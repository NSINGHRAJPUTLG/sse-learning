'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generatePayslip, getPayrollById } from '@/services/payroll.service';

export default function PayrollDetailPage() {
  const params = useParams<{ id: string }>();
  const { data } = useQuery({ queryKey: ['payroll', params.id], queryFn: () => getPayrollById(params.id) });
  const payslipMutation = useMutation({ mutationFn: () => generatePayslip(params.id) });

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h2 className="text-lg font-semibold">Payroll Details</h2>
      <p>Month/Year: {data?.month}/{data?.year}</p>
      <p>Gross: {data?.grossSalary}</p>
      <p>Deductions: {data?.totalDeductions}</p>
      <p>Net Salary: {data?.netSalary}</p>
      <p>Status: {data?.status}</p>
      <button className="px-3 py-2 rounded bg-slate-900 text-white" onClick={() => payslipMutation.mutate()}>Generate Payslip</button>
      {payslipMutation.data?.pdfUrl ? <a href={payslipMutation.data.pdfUrl}>Download PDF</a> : null}
    </section>
  );
}
