'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generatePayroll, getPayroll, lockPayroll, payPayroll } from '@/services/payroll.service';

export default function PayrollPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data } = useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => getPayroll({ page: 1, limit: 20, month, year }),
  });

  const generate = useMutation({ mutationFn: () => generatePayroll({ month, year }), onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }) });
  const lock = useMutation({ mutationFn: (id: string) => lockPayroll(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }) });
  const pay = useMutation({ mutationFn: (id: string) => payPayroll(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }) });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Payroll</h2>
      <div className="flex gap-2 items-center flex-wrap">
        <input type="number" className="border rounded p-2 w-28" value={month} onChange={(e) => setMonth(Number(e.target.value))} min={1} max={12} />
        <input type="number" className="border rounded p-2 w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2000} />
        <button className="px-3 py-2 bg-slate-900 text-white rounded" onClick={() => generate.mutate()}>Generate</button>
      </div>

      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100"><tr><th className="p-2 text-left">Employee</th><th className="p-2 text-left">Net Salary</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Actions</th></tr></thead>
          <tbody>
            {(data?.items || []).map((row: any) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{row.employeeId}</td>
                <td className="p-2">{row.netSalary}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2 space-x-2">
                  <button onClick={() => lock.mutate(row._id)} className="text-blue-700">Lock</button>
                  <button onClick={() => pay.mutate(row._id)} className="text-emerald-700">Mark Paid</button>
                  <Link href={`/payroll/${row._id}`} className="text-slate-700">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
