'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/notification.service';

export default function NotificationsDropdown() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications', { unreadOnly: true }],
    queryFn: () => getNotifications({ unreadOnly: true, page: 1, limit: 5 }),
  });

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data?.items || [];

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none px-3 py-2 rounded bg-slate-100 text-sm">
        Notifications ({items.length})
      </summary>
      <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow p-3 z-20">
        <button onClick={() => readAll.mutate()} className="text-xs text-blue-600 mb-2">Mark all as read</button>
        <ul className="space-y-2">
          {items.map((item: any) => (
            <li key={item._id} className="border rounded p-2 text-xs">
              <div className="font-semibold">{item.title}</div>
              <p>{item.message}</p>
              <button onClick={() => readOne.mutate(item._id)} className="text-blue-600 mt-1">Mark read</button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
