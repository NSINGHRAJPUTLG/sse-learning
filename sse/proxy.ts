import { NextRequest, NextResponse } from 'next/server';

const protectedPaths = [
  '/dashboard',
  '/employees',
  '/attendance',
  '/leave',
  '/payroll',
  '/reports',
  '/audit',
  '/notifications',
  '/departments',
];

const roleRules: Record<string, string[]> = {
  '/reports': ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'],
  '/audit': ['HR_ADMIN', 'SUPER_ADMIN'],
  '/audit/my': ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'],
  '/departments/create': ['HR_ADMIN', 'SUPER_ADMIN'],
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value;
  const role = req.cookies.get('role')?.value || '';

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const matchedRule = Object.keys(roleRules)
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (matchedRule && !roleRules[matchedRule].includes(role)) {
    return NextResponse.redirect(new URL('/403', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/employees/:path*', '/attendance/:path*', '/leave/:path*', '/payroll/:path*', '/reports/:path*', '/audit/:path*', '/notifications/:path*', '/departments/:path*'],
};
