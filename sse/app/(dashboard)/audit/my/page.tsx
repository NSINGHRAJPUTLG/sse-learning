'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyActivity } from '@/services/audit.service';

export default function MyActivityPage() {
  const { data } = useQuery({ queryKey: ['my-activity'], queryFn: () => getMyActivity({ page: 1, limit: 20 }) });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">My Activity</h2>
      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100"><tr><th className="p-2 text-left">Time</th><th className="p-2 text-left">Action</th><th className="p-2 text-left">Module</th></tr></thead>
          <tbody>
            {(data?.items || []).map((row: any) => (
              <tr key={row._id} className="border-t"><td className="p-2">{new Date(row.createdAt).toLocaleString()}</td><td className="p-2">{row.action}</td><td className="p-2">{row.module}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
