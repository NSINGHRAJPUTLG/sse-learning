'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { navByRole } from './role-nav';

export default function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const links = navByRole[role] || [];

  return (
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
  );
}
