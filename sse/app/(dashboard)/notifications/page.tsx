'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/notification.service';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications-page'], queryFn: () => getNotifications({ page: 1, limit: 20 }) });

  const markOne = useMutation({ mutationFn: (id: string) => markNotificationRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-page'] }) });
  const markAll = useMutation({ mutationFn: () => markAllNotificationsRead(), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-page'] }) });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <button className="px-3 py-2 rounded bg-slate-900 text-white text-sm" onClick={() => markAll.mutate()}>Read all</button>
      </div>

      <div className="grid gap-3">
        {(data?.items || []).map((n: any) => (
          <article key={n._id} className="bg-white border rounded p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{n.title}</h3>
              {!n.isRead ? <button className="text-blue-700 text-sm" onClick={() => markOne.mutate(n._id)}>Mark read</button> : null}
            </div>
            <p className="text-sm text-slate-600 mt-1">{n.message}</p>
            <p className="text-xs text-slate-500 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
