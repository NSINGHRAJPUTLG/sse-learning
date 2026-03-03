'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearAuthCookies, decodeJwt, setAuthCookies, type UserRole } from '@/lib/auth';

type UserInfo = {
  id: string;
  email: string;
  role: UserRole;
  companyId: string;
};

type AuthState = {
  token: string;
  refreshToken: string;
  user: UserInfo | null;
  role: UserRole;
  setSession: (token: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: '',
      refreshToken: '',
      user: null,
      role: '',
      setSession: (token, refreshToken) => {
        const decoded = decodeJwt(token);
        const role = (decoded.role || '') as UserRole;
        const user = {
          id: decoded.userId || '',
          email: decoded.email || '',
          role,
          companyId: decoded.companyId || '',
        };

        setAuthCookies(token, role);
        set({ token, refreshToken, role, user });
      },
      setAccessToken: (token) => {
        const decoded = decodeJwt(token);
        const role = (decoded.role || '') as UserRole;
        setAuthCookies(token, role);
        set({ token, role: role || '', user: decoded.userId ? { id: decoded.userId, email: decoded.email || '', role, companyId: decoded.companyId || '' } : null });
      },
      logout: () => {
        clearAuthCookies();
        set({ token: '', refreshToken: '', user: null, role: '' });
      },
    }),
    {
      name: 'hrm-auth',
      partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken, user: state.user, role: state.role }),
    }
  )
);
