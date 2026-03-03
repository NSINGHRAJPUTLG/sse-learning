'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployee } from '@/services/employee.service';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  joiningDate: z.string().min(1),
  employmentType: z.enum(['FULL_TIME', 'INTERN', 'CONTRACT']),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['EMPLOYEE', 'MANAGER']),
});

type FormData = z.infer<typeof schema>;

export default function CreateEmployeePage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { employmentType: 'FULL_TIME', role: 'EMPLOYEE' },
  });

  async function onSubmit(values: FormData) {
    await createEmployee({
      firstName: values.firstName,
      lastName: values.lastName,
      joiningDate: values.joiningDate,
      employmentType: values.employmentType,
      user: {
        email: values.email,
        password: values.password,
        role: values.role,
      },
    });
    router.push('/employees');
  }

  return (
    <section className="max-w-xl bg-white border rounded p-4 space-y-4">
      <h2 className="text-lg font-semibold">Create Employee</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3">
        <input className="border rounded p-2" placeholder="First Name" {...register('firstName')} />
        {errors.firstName ? <p className="text-xs text-red-600">{errors.firstName.message}</p> : null}
        <input className="border rounded p-2" placeholder="Last Name" {...register('lastName')} />
        <input className="border rounded p-2" type="date" {...register('joiningDate')} />
        <select className="border rounded p-2" {...register('employmentType')}>
          <option value="FULL_TIME">FULL_TIME</option>
          <option value="INTERN">INTERN</option>
          <option value="CONTRACT">CONTRACT</option>
        </select>
        <input className="border rounded p-2" placeholder="Login Email" {...register('email')} />
        <input className="border rounded p-2" type="password" placeholder="Temp Password" {...register('password')} />
        <select className="border rounded p-2" {...register('role')}>
          <option value="EMPLOYEE">EMPLOYEE</option>
          <option value="MANAGER">MANAGER</option>
        </select>
        <button disabled={isSubmitting} className="bg-slate-900 text-white rounded p-2">{isSubmitting ? 'Saving...' : 'Create'}</button>
      </form>
    </section>
  );
}
