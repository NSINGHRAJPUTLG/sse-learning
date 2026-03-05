'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { navByRole } from './role-nav';

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const links = navByRole[role] || [];

  useEffect(() => {
    if (mobileOpen) onMobileClose?.();
  }, [pathname]);

  function closeMobileMenu() {
    onMobileClose?.();
  }

  return (
    <>
      <aside className="w-64 bg-slate-900 text-slate-100 p-4 hidden md:block">
        <h2 className="text-lg font-semibold mb-4">HRM</h2>
        <nav className="space-y-2">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 text-sm ${pathname === item.href ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className={`md:hidden fixed inset-0 z-40 ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeMobileMenu}
          className={`absolute inset-0 bg-black/40 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-slate-900 text-slate-100 p-4 transition-transform ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">HRM</h2>
            <button type="button" onClick={closeMobileMenu} className="text-sm px-2 py-1 rounded bg-slate-800">
              Close
            </button>
          </div>
          <nav className="space-y-2">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`block rounded px-3 py-2 text-sm ${pathname === item.href ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
