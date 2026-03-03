'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approveLeave, getLeaves, rejectLeave } from '@/services/leave.service';

export default function LeavePage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['leaves'], queryFn: () => getLeaves({ page: 1, limit: 20 }) });

  const approve = useMutation({ mutationFn: (id: string) => approveLeave(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }) });
  const reject = useMutation({ mutationFn: (id: string) => rejectLeave(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }) });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Leave</h2>
        <Link className="px-3 py-2 rounded bg-slate-900 text-white text-sm" href="/leave/apply">Apply Leave</Link>
      </div>
      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100"><tr><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Days</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Actions</th></tr></thead>
          <tbody>
            {(data?.items || []).map((row: any) => (
              <tr key={row._id} className="border-t">
                <td className="p-2">{new Date(row.startDate).toLocaleDateString()}</td>
                <td className="p-2">{new Date(row.endDate).toLocaleDateString()}</td>
                <td className="p-2">{row.totalDays}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2 space-x-2">
                  <button onClick={() => approve.mutate(row._id)} className="text-emerald-700">Approve</button>
                  <button onClick={() => reject.mutate(row._id)} className="text-red-700">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
