'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { companyId: 'company-test', email: 'admin@example.com', password: 'Password123!' },
  });

  async function onSubmit(values: FormData) {
    const data = await login(values);
    setSession(data.accessToken, data.refreshToken);
    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input className="w-full border rounded p-2" placeholder="Company ID" {...register('companyId')} />
      {errors.companyId ? <p className="text-xs text-red-600">{errors.companyId.message}</p> : null}

      <input className="w-full border rounded p-2" placeholder="Email" {...register('email')} />
      {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}

      <input type="password" className="w-full border rounded p-2" placeholder="Password" {...register('password')} />
      {errors.password ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}

      <button disabled={isSubmitting} className="w-full bg-slate-900 text-white rounded p-2 disabled:opacity-60">
        {isSubmitting ? 'Signing in...' : 'Login'}
      </button>
    </form>
  );
}
