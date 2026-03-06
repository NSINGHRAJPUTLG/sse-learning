'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import Skeleton from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/toast';
import { getDepartments } from '@/services/department.service';
import { getEmployeeById, getEmployees, updateEmployee } from '@/services/employee.service';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.union([z.literal(''), z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])]),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
  reportingManagerId: z.string().optional(),
  joiningDate: z.string().min(1),
  employmentType: z.enum(['FULL_TIME', 'INTERN', 'CONTRACT']),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  userRole: z.union([z.literal(''), z.enum(['EMPLOYEE', 'MANAGER'])]),
});

type FormData = z.infer<typeof schema>;

type EntityRef = { _id: string; name?: string; firstName?: string; lastName?: string; employeeId?: string };

type EmployeeDetail = {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  departmentId?: string | EntityRef;
  designation?: string;
  reportingManagerId?: string | EntityRef;
  joiningDate: string;
  employmentType: 'FULL_TIME' | 'INTERN' | 'CONTRACT';
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED';
  address?: string;
  emergencyContact?: string;
  userId?: { email?: string; role?: string };
};

function toInputDate(date?: string) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function refId(value?: string | EntityRef) {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id;
}

function optionalText(value?: string) {
  const next = (value || '').trim();
  return next ? next : undefined;
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const canManage = role === 'SUPER_ADMIN' || role === 'HR_ADMIN';
  const canChangeRole = role === 'HR_ADMIN';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      departmentId: '',
      designation: '',
      reportingManagerId: '',
      joiningDate: '',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      address: '',
      emergencyContact: '',
      userRole: '',
    },
  });

  const { data, isLoading } = useQuery<EmployeeDetail>({
    queryKey: ['employee', params.id],
    queryFn: () => getEmployeeById(params.id),
    enabled: Boolean(params.id),
  });

  const { data: departments } = useQuery({
    queryKey: ['department-options-for-employee'],
    queryFn: () => getDepartments({ page: 1, limit: 200, isActive: true, sortBy: 'name', order: 'asc' }),
    enabled: canManage,
  });

  const { data: employees } = useQuery({
    queryKey: ['employee-options-for-manager'],
    queryFn: () => getEmployees({ page: 1, limit: 300, sortBy: 'firstName', order: 'asc' }),
    enabled: canManage,
  });

  useEffect(() => {
    if (!data) return;

    reset({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone || '',
      dateOfBirth: toInputDate(data.dateOfBirth),
      gender: (data.gender as FormData['gender']) || '',
      departmentId: refId(data.departmentId),
      designation: data.designation || '',
      reportingManagerId: refId(data.reportingManagerId),
      joiningDate: toInputDate(data.joiningDate),
      employmentType: data.employmentType,
      status: data.status,
      address: data.address || '',
      emergencyContact: data.emergencyContact || '',
      userRole: (data.userId?.role as FormData['userRole']) || '',
    });
  }, [data, reset]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateEmployee(params.id, payload),
    onSuccess: () => {
      toast.success('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', params.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update employee'));
    },
  });

  async function onSubmit(values: FormData) {
    const payload: Record<string, unknown> = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: optionalText(values.phone),
      dateOfBirth: values.dateOfBirth || undefined,
      gender: values.gender || undefined,
      departmentId: values.departmentId || undefined,
      designation: optionalText(values.designation),
      reportingManagerId: values.reportingManagerId || undefined,
      joiningDate: values.joiningDate,
      employmentType: values.employmentType,
      status: values.status,
      address: optionalText(values.address),
      emergencyContact: optionalText(values.emergencyContact),
    };

    if (canChangeRole && values.userRole) {
      payload.userRole = values.userRole;
    }

    updateMutation.mutate(payload);
  }

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data) return <p className="text-sm text-slate-600">Employee not found.</p>;

  if (!canManage) {
    return (
      <section className="bg-white border rounded p-4">
        <h2 className="text-lg font-semibold">{data.firstName} {data.lastName}</h2>
        <div className="text-sm text-slate-600 mt-2 space-y-1">
          <p>Employee ID: {data.employeeId}</p>
          <p>Status: {data.status}</p>
          <p>Designation: {data.designation || '-'}</p>
          <p>Email: {data.userId?.email || '-'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-3xl bg-white border rounded p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Edit Employee: {data.employeeId}</h2>
        <button className="px-3 py-2 border rounded text-sm" onClick={() => router.push('/employees')}>Back</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <input className="w-full border rounded p-2" placeholder="First Name" {...register('firstName')} />
          {errors.firstName ? <p className="text-xs text-red-600">{errors.firstName.message}</p> : null}
        </div>
        <div>
          <input className="w-full border rounded p-2" placeholder="Last Name" {...register('lastName')} />
          {errors.lastName ? <p className="text-xs text-red-600">{errors.lastName.message}</p> : null}
        </div>

        <input className="w-full border rounded p-2" placeholder="Phone" {...register('phone')} />
        <input className="w-full border rounded p-2" placeholder="Designation" {...register('designation')} />

        <input className="w-full border rounded p-2" type="date" {...register('dateOfBirth')} />
        <select className="w-full border rounded p-2" {...register('gender')}>
          <option value="">Select gender</option>
          <option value="MALE">MALE</option>
          <option value="FEMALE">FEMALE</option>
          <option value="OTHER">OTHER</option>
          <option value="PREFER_NOT_TO_SAY">PREFER_NOT_TO_SAY</option>
        </select>

        <input className="w-full border rounded p-2" type="date" {...register('joiningDate')} />
        <select className="w-full border rounded p-2" {...register('employmentType')}>
          <option value="FULL_TIME">FULL_TIME</option>
          <option value="INTERN">INTERN</option>
          <option value="CONTRACT">CONTRACT</option>
        </select>

        <select className="w-full border rounded p-2" {...register('status')}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ON_LEAVE">ON_LEAVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="TERMINATED">TERMINATED</option>
          <option value="RESIGNED">RESIGNED</option>
        </select>

        <select className="w-full border rounded p-2" {...register('departmentId')}>
          <option value="">Keep current department</option>
          {(departments?.items || []).map((department) => (
            <option key={department._id} value={department._id}>{department.name}</option>
          ))}
        </select>

        <select className="w-full border rounded p-2" {...register('reportingManagerId')}>
          <option value="">Keep current manager</option>
          {(employees?.items || [])
            .filter((employee) => employee._id !== data._id)
            .map((employee) => (
              <option key={employee._id} value={employee._id}>
                {employee.firstName} {employee.lastName} ({employee.employeeId})
              </option>
            ))}
        </select>

        {canChangeRole ? (
          <select className="w-full border rounded p-2" {...register('userRole')}>
            <option value="">Keep current user role</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="MANAGER">MANAGER</option>
          </select>
        ) : (
          <input className="w-full border rounded p-2 bg-slate-100" value={data.userId?.role || '-'} readOnly />
        )}

        <input className="w-full border rounded p-2" placeholder="Emergency Contact" {...register('emergencyContact')} />

        <textarea className="md:col-span-2 w-full border rounded p-2" rows={3} placeholder="Address" {...register('address')} />

        <div className="md:col-span-2 flex justify-end">
          <button disabled={isSubmitting || updateMutation.isPending} className="bg-slate-900 text-white rounded p-2 px-4 disabled:opacity-60">
            {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </section>
  );
}
