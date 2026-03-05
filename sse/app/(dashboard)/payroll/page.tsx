'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { generatePayroll, getPayroll, lockPayroll, payPayroll } from '@/services/payroll.service';
import { getErrorMessage } from '@/lib/toast';

export default function PayrollPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [lockingId, setLockingId] = useState('');
  const [payingId, setPayingId] = useState('');

  const { data } = useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => getPayroll({ page: 1, limit: 20, month, year }),
  });

  const generate = useMutation({
    mutationFn: () => generatePayroll({ month, year }),
    onSuccess: () => {
      toast.success('Payroll generated successfully');
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to generate payroll')),
  });
  const lock = useMutation({
    mutationFn: (id: string) => lockPayroll(id),
    onMutate: (id) => setLockingId(id),
    onSettled: () => setLockingId(''),
    onSuccess: () => {
      toast.success('Payroll locked successfully');
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to lock payroll')),
  });
  const pay = useMutation({
    mutationFn: (id: string) => payPayroll(id),
    onMutate: (id) => setPayingId(id),
    onSettled: () => setPayingId(''),
    onSuccess: () => {
      toast.success('Payroll marked as paid');
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to mark payroll as paid')),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Payroll</h2>
      <div className="flex gap-2 items-center flex-wrap">
        <input type="number" className="border rounded p-2 w-28" value={month} onChange={(e) => setMonth(Number(e.target.value))} min={1} max={12} />
        <input type="number" className="border rounded p-2 w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2000} />
        <button
          className="px-3 py-2 bg-slate-900 text-white rounded disabled:opacity-60"
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? 'Generating...' : 'Generate'}
        </button>
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
                  <button
                    onClick={() => lock.mutate(row._id)}
                    disabled={lock.isPending || pay.isPending}
                    className="text-blue-700 disabled:opacity-60"
                  >
                    {lock.isPending && lockingId === row._id ? 'Locking...' : 'Lock'}
                  </button>
                  <button
                    onClick={() => pay.mutate(row._id)}
                    disabled={lock.isPending || pay.isPending}
                    className="text-emerald-700 disabled:opacity-60"
                  >
                    {pay.isPending && payingId === row._id ? 'Paying...' : 'Mark Paid'}
                  </button>
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
