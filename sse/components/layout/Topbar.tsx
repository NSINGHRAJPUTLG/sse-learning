'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { logout } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/toast';
import NotificationsDropdown from './NotificationsDropdown';
import { useTheme } from '@/components/theme/ThemeProvider';

type TopbarProps = {
  onMenuClick?: () => void;
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const { user, logout: clear } = useAuthStore();
  const { theme, toggleTheme, isReady } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Logout failed'));
    } finally {
      clear();
      router.push('/login');
    }
  }

  return (
    <header className="h-16 border-b bg-white px-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="md:hidden px-2 py-2 rounded border text-slate-700"
        >
          <span className="block w-4 h-0.5 bg-current mb-1" />
          <span className="block w-4 h-0.5 bg-current mb-1" />
          <span className="block w-4 h-0.5 bg-current" />
        </button>
        <h1 className="font-semibold text-slate-800">HRM Dashboard</h1>
        <p className="text-xs text-slate-500 truncate hidden sm:block">{user?.email || 'Guest'}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="px-3 py-2 rounded border text-sm text-slate-700 bg-white"
          aria-label="Toggle light and dark theme"
        >
          {isReady && theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <NotificationsDropdown />
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-3 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-60"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </header>
  );
}
