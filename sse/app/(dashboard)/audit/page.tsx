'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '@/services/audit.service';

export default function AuditPage() {
  const [module, setModule] = useState('');
  const { data } = useQuery({ queryKey: ['audit', module], queryFn: () => getAuditLogs({ page: 1, limit: 20, ...(module ? { module } : {}) }) });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Audit Logs</h2>
      <div className="flex gap-2">
        <input className="border rounded p-2" placeholder="Filter module" value={module} onChange={(e) => setModule(e.target.value)} />
      </div>
      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100"><tr><th className="p-2 text-left">Time</th><th className="p-2 text-left">Module</th><th className="p-2 text-left">Action</th><th className="p-2 text-left">Entity</th></tr></thead>
          <tbody>
            {(data?.items || []).map((row: any) => (
              <tr key={row._id} className="border-t"><td className="p-2">{new Date(row.createdAt).toLocaleString()}</td><td className="p-2">{row.module}</td><td className="p-2">{row.action}</td><td className="p-2">{row.entityType}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
