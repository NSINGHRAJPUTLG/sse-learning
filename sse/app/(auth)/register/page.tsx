'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { register as registerUser } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/toast';

const schema = z.object({
  companyId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'EMPLOYEE', 'MANAGER', 'HR_ADMIN']),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { companyId: 'company-test', role: 'SUPER_ADMIN' },
  });

  async function onSubmit(values: FormData) {
    try {
      await registerUser(values);
      reset();
      toast.success('User registered successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'User registration failed'));
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-slate-100">
      <section className="w-full max-w-md bg-white rounded-xl border p-6">
        <h1 className="text-xl font-semibold mb-4">Register User</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <input className="w-full border rounded p-2" placeholder="Company ID" {...register('companyId')} />
          {errors.companyId ? <p className="text-xs text-red-600">{errors.companyId.message}</p> : null}
          <input className="w-full border rounded p-2" placeholder="Email" {...register('email')} />
          <input type="password" className="w-full border rounded p-2" placeholder="Password" {...register('password')} />
          <select className="w-full border rounded p-2" {...register('role')}>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="MANAGER">MANAGER</option>
            <option value="HR_ADMIN">HR_ADMIN</option>
          </select>
          <button disabled={isSubmitting} className="w-full bg-slate-900 text-white rounded p-2 disabled:opacity-60">
            {isSubmitting ? 'Submitting...' : 'Create'}
          </button>
        </form>
      </section>
    </main>
  );
}
