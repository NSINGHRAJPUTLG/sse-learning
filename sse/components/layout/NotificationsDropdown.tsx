'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/notification.service';
import { getErrorMessage } from '@/lib/toast';

export default function NotificationsDropdown() {
  const qc = useQueryClient();
  const [markingId, setMarkingId] = useState('');
  const { data } = useQuery({
    queryKey: ['notifications', { unreadOnly: true }],
    queryFn: () => getNotifications({ unreadOnly: true, page: 1, limit: 5 }),
  });

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => setMarkingId(id),
    onSettled: () => setMarkingId(''),
    onSuccess: () => {
      toast.success('Notification marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to mark notification')),
  });

  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to mark all notifications')),
  });

  const items = data?.items || [];

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none px-3 py-2 rounded bg-slate-100 text-sm text-slate-700">
        Notifications ({items.length})
      </summary>
      <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow p-3 z-20">
        <button
          onClick={() => readAll.mutate()}
          disabled={readAll.isPending}
          className="text-xs text-blue-600 mb-2 disabled:opacity-60"
        >
          {readAll.isPending ? 'Marking all...' : 'Mark all as read'}
        </button>
        <ul className="space-y-2">
          {items.map((item: any) => (
            <li key={item._id} className="border rounded p-2 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">{item.title}</div>
              <p className="text-slate-600">{item.message}</p>
              <button
                onClick={() => readOne.mutate(item._id)}
                disabled={readOne.isPending}
                className="text-blue-600 mt-1 disabled:opacity-60"
              >
                {readOne.isPending && markingId === item._id ? 'Marking...' : 'Mark read'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
