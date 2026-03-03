'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkIn, checkOut, getAttendance } from '@/services/attendance.service';

export default function AttendancePage() {
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');

  const { data } = useQuery({
    queryKey: ['attendance', employeeId],
    queryFn: () => getAttendance({ page: 1, limit: 20, ...(employeeId ? { employeeId } : {}) }),
  });

  const inMutation = useMutation({ mutationFn: () => checkIn(), onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }) });
  const outMutation = useMutation({ mutationFn: () => checkOut(), onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }) });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Attendance</h2>
      <div className="flex gap-2 flex-wrap">
        <button className="px-3 py-2 rounded bg-emerald-700 text-white" disabled={inMutation.isPending} onClick={() => inMutation.mutate()}>Check In</button>
        <button className="px-3 py-2 rounded bg-amber-700 text-white" disabled={outMutation.isPending} onClick={() => outMutation.mutate()}>Check Out</button>
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
