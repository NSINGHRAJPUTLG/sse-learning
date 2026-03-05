'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { approveLeave, getLeaves, rejectLeave } from '@/services/leave.service';
import { getErrorMessage } from '@/lib/toast';

export default function LeavePage() {
  const qc = useQueryClient();
  const [approvingId, setApprovingId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const { data } = useQuery({ queryKey: ['leaves'], queryFn: () => getLeaves({ page: 1, limit: 20 }) });

  const approve = useMutation({
    mutationFn: (id: string) => approveLeave(id),
    onMutate: (id) => setApprovingId(id),
    onSettled: () => setApprovingId(''),
    onSuccess: () => {
      toast.success('Leave approved successfully');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to approve leave')),
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectLeave(id),
    onMutate: (id) => setRejectingId(id),
    onSettled: () => setRejectingId(''),
    onSuccess: () => {
      toast.success('Leave rejected successfully');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to reject leave')),
  });

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
                  <button
                    onClick={() => approve.mutate(row._id)}
                    disabled={approve.isPending || reject.isPending}
                    className="text-emerald-700 disabled:opacity-60"
                  >
                    {approve.isPending && approvingId === row._id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => reject.mutate(row._id)}
                    disabled={approve.isPending || reject.isPending}
                    className="text-red-700 disabled:opacity-60"
                  >
                    {reject.isPending && rejectingId === row._id ? 'Rejecting...' : 'Reject'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
