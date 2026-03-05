'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { checkIn, checkOut, getAttendance } from '@/services/attendance.service';
import { getErrorMessage } from '@/lib/toast';

export default function AttendancePage() {
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');

  const { data } = useQuery({
    queryKey: ['attendance', employeeId],
    queryFn: () => getAttendance({ page: 1, limit: 20, ...(employeeId ? { employeeId } : {}) }),
  });

  const inMutation = useMutation({
    mutationFn: () => checkIn(),
    onSuccess: () => {
      toast.success('Checked in successfully');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Check in failed')),
  });
  const outMutation = useMutation({
    mutationFn: () => checkOut(),
    onSuccess: () => {
      toast.success('Checked out successfully');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Check out failed')),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Attendance</h2>
      <div className="flex gap-2 flex-wrap">
        <button className="px-3 py-2 rounded bg-emerald-700 text-white disabled:opacity-60" disabled={inMutation.isPending} onClick={() => inMutation.mutate()}>
          {inMutation.isPending ? 'Checking in...' : 'Check In'}
        </button>
        <button className="px-3 py-2 rounded bg-amber-700 text-white disabled:opacity-60" disabled={outMutation.isPending} onClick={() => outMutation.mutate()}>
          {outMutation.isPending ? 'Checking out...' : 'Check Out'}
        </button>
        <input className="border rounded p-2" placeholder="Filter by employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
      </div>
      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Hours</th><th className="p-2 text-left">Overtime</th></tr></thead>
          <tbody>
            {(data?.items || []).map((row: any) => (
              <tr key={row._id} className="border-t"><td className="p-2">{new Date(row.date).toLocaleDateString()}</td><td className="p-2">{row.status}</td><td className="p-2">{row.totalHours}</td><td className="p-2">{row.overtimeHours}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
