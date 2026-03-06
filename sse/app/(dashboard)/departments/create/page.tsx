'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { createDepartment, getDepartments } from '@/services/department.service';
import { getEmployees } from '@/services/employee.service';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/lib/toast';

const schema = z.object({
  name: z.string().min(1, 'Department name is required').max(120),
  description: z.string().max(400).optional(),
  managerId: z.string().optional(),
  parentDepartmentId: z.string().optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function CreateDepartmentPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canManage = role === 'SUPER_ADMIN' || role === 'HR_ADMIN';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      isActive: true,
      name: '',
      description: '',
      managerId: '',
      parentDepartmentId: '',
    },
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['department-options'],
    queryFn: () => getDepartments({ limit: 200, page: 1, isActive: true, sortBy: 'name', order: 'asc' }),
    enabled: canManage,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['manager-options'],
    queryFn: () => getEmployees({ limit: 200, page: 1, sortBy: 'firstName', order: 'asc' }),
    enabled: canManage,
  });

  const managers = useMemo(() => {
    return (employeesData?.items || []).filter((employee) => employee.userId?.role === 'MANAGER');
  }, [employeesData?.items]);

  async function onSubmit(values: FormData) {
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        managerId: values.managerId || undefined,
        parentDepartmentId: values.parentDepartmentId ? values.parentDepartmentId : null,
        isActive: values.isActive,
      };

      await createDepartment(payload);
      toast.success('Department created successfully');
      router.push('/departments');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create department'));
    }
  }

  if (!canManage) {
    return (
      <section className="max-w-xl bg-white border rounded p-4">
        <h2 className="text-lg font-semibold">Create Department</h2>
        <p className="mt-2 text-sm text-slate-600">Only SUPER_ADMIN or HR_ADMIN can create departments.</p>
      </section>
    );
  }

  return (
    <section className="max-w-xl bg-white border rounded p-4 space-y-4">
      <h2 className="text-lg font-semibold">Create Department</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3">
        <div>
          <input className="w-full border rounded p-2" placeholder="Department Name" {...register('name')} />
          {errors.name ? <p className="text-xs text-red-600 mt-1">{errors.name.message}</p> : null}
        </div>

        <textarea className="w-full border rounded p-2" rows={4} placeholder="Description" {...register('description')} />

        <select className="w-full border rounded p-2" {...register('parentDepartmentId')}>
          <option value="">No Parent Department</option>
          {(departmentsData?.items || []).map((department) => (
            <option key={department._id} value={department._id}>
              {department.name}
            </option>
          ))}
        </select>

        <select className="w-full border rounded p-2" {...register('managerId')}>
          <option value="">No Manager</option>
          {managers.map((manager) => (
            <option key={manager._id} value={manager._id}>
              {manager.firstName} {manager.lastName} ({manager.employeeId})
            </option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} />
          Department is active
        </label>

        <button disabled={isSubmitting} className="bg-slate-900 text-white rounded p-2 disabled:opacity-60">
          {isSubmitting ? 'Saving...' : 'Create Department'}
        </button>
      </form>
    </section>
  );
}
