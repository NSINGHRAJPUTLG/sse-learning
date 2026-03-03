export type UserRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE' | '';

export type DecodedToken = {
  userId?: string;
  role?: UserRole;
  companyId?: string;
  email?: string;
  exp?: number;
};

export function decodeJwt(token: string): DecodedToken {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return {};
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

export function setAuthCookies(token: string, role: string) {
  document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=lax`;
  document.cookie = `role=${encodeURIComponent(role)}; path=/; max-age=86400; samesite=lax`;
}

export function clearAuthCookies() {
  document.cookie = 'access_token=; path=/; max-age=0';
  document.cookie = 'role=; path=/; max-age=0';
}
