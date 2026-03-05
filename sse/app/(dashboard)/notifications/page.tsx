'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/notification.service';
import { getErrorMessage } from '@/lib/toast';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [markingId, setMarkingId] = useState('');
  const { data } = useQuery({ queryKey: ['notifications-page'], queryFn: () => getNotifications({ page: 1, limit: 20 }) });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => setMarkingId(id),
    onSettled: () => setMarkingId(''),
    onSuccess: () => {
      toast.success('Notification marked as read');
      qc.invalidateQueries({ queryKey: ['notifications-page'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to mark notification')),
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      qc.invalidateQueries({ queryKey: ['notifications-page'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to mark all notifications')),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <button
          className="px-3 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-60"
          disabled={markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          {markAll.isPending ? 'Marking all...' : 'Read all'}
        </button>
      </div>

      <div className="grid gap-3">
        {(data?.items || []).map((n: any) => (
          <article key={n._id} className="bg-white border rounded p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{n.title}</h3>
              {!n.isRead ? (
                <button
                  className="text-blue-700 text-sm disabled:opacity-60"
                  disabled={markOne.isPending}
                  onClick={() => markOne.mutate(n._id)}
                >
                  {markOne.isPending && markingId === n._id ? 'Marking...' : 'Mark read'}
                </button>
              ) : null}
            </div>
            <p className="text-sm text-slate-600 mt-1">{n.message}</p>
            <p className="text-xs text-slate-500 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
