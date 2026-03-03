import Link from 'next/link';
import LoginForm from '@/features/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-slate-100">
      <section className="w-full max-w-md bg-white rounded-xl border p-6">
        <h1 className="text-xl font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-slate-600 mb-4">Access your HRM dashboard.</p>
        <LoginForm />
        <p className="text-xs text-slate-500 mt-4">
          Need user creation? Use admin account or <Link className="underline" href="/register">register</Link>.
        </p>
      </section>
    </main>
  );
}
