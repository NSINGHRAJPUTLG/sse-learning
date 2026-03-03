'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { logout } from '@/services/auth.service';
import NotificationsDropdown from './NotificationsDropdown';

export default function Topbar() {
  const router = useRouter();
  const { user, logout: clear } = useAuthStore();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
      router.push('/login');
    }
  }

  return (
    <header className="h-16 border-b bg-white px-4 flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-slate-800">HRM Dashboard</h1>
        <p className="text-xs text-slate-500">{user?.email || 'Guest'}</p>
      </div>
      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <button onClick={handleLogout} className="px-3 py-2 rounded bg-slate-900 text-white text-sm">Logout</button>
      </div>
    </header>
  );
}
