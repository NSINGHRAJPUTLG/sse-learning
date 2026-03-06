'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/toast';
import {
  getDepartmentById,
  getDepartmentStats,
  updateDepartment,
  type Department,
  type DepartmentManager,
} from '@/services/department.service';
import { getEmployees, updateEmployee, type Employee } from '@/services/employee.service';
import { useAuthStore } from '@/store/auth.store';

const assignableRoleOptions = ['ALL', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE', 'SUPER_ADMIN'] as const;
type AssignableRole = (typeof assignableRoleOptions)[number];

function managerName(manager: string | DepartmentManager | null | undefined) {
  if (!manager || typeof manager === 'string') return '-';
  return `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.employeeId || '-';
}

function currentManagerId(department?: Department) {
  if (!department?.managerId) return '';
  if (typeof department.managerId === 'string') return department.managerId;
  return department.managerId._id;
}

export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const canManage = role === 'SUPER_ADMIN' || role === 'HR_ADMIN';

  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [roleFilter, setRoleFilter] = useState<AssignableRole>('ALL');

  const { data: department, isLoading } = useQuery({
    queryKey: ['department', params.id],
    queryFn: () => getDepartmentById(params.id),
    enabled: Boolean(params.id),
  });

  const { data: stats } = useQuery({
    queryKey: ['department-stats', params.id],
    queryFn: () => getDepartmentStats(params.id),
    enabled: Boolean(params.id),
  });

  const { data: departmentEmployees } = useQuery({
    queryKey: ['department-employees', params.id],
    queryFn: () => getEmployees({ page: 1, limit: 100, departmentId: params.id }),
    enabled: Boolean(params.id),
  });

  const { data: allEmployees } = useQuery({
    queryKey: ['all-employees-for-assignment'],
    queryFn: () => getEmployees({ page: 1, limit: 300, sortBy: 'firstName', order: 'asc' }),
    enabled: canManage,
  });

  const managerCandidates = useMemo(() => {
    return (allEmployees?.items || []).filter((employee) => employee.userId?.role === 'MANAGER');
  }, [allEmployees?.items]);

  const assignableEmployees = useMemo(() => {
    return (allEmployees?.items || []).filter((employee) => {
      if (roleFilter === 'ALL') return true;
      return employee.userId?.role === roleFilter;
    });
  }, [allEmployees?.items, roleFilter]);

  const managerMutation = useMutation({
    mutationFn: (managerId: string) => updateDepartment(params.id, { managerId }),
    onSuccess: () => {
      toast.success('Department manager updated');
      queryClient.invalidateQueries({ queryKey: ['department', params.id] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update manager'));
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ employeeId, departmentId }: { employeeId: string; departmentId: string }) => updateEmployee(employeeId, { departmentId }),
    onSuccess: () => {
      toast.success('Employee assigned to department');
      queryClient.invalidateQueries({ queryKey: ['department-employees', params.id] });
      queryClient.invalidateQueries({ queryKey: ['all-employees-for-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats', params.id] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to assign employee'));
    },
  });

  if (isLoading) return <Skeleton className="h-36 w-full" />;
  if (!department) return <p className="text-sm text-slate-600">Department not found.</p>;

  const selectedManagerEffectiveId = selectedManagerId || currentManagerId(department);

  return (
    <section className="space-y-4">
      <div className="bg-white border rounded p-4">
        <h2 className="text-xl font-semibold">{department.name}</h2>
        <p className="text-sm text-slate-600 mt-1">{department.description || 'No description available'}</p>
        <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm">
          <div className="border rounded p-3">
            <p className="text-slate-500">Status</p>
            <p className="font-medium">{department.isActive ? 'ACTIVE' : 'INACTIVE'}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-slate-500">Department Manager</p>
            <p className="font-medium">{managerName(department.managerId)}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-slate-500">Total Employees</p>
            <p className="font-medium">{stats?.totalEmployees ?? 0}</p>
          </div>
        </div>
      </div>

      {canManage ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded p-4 space-y-3">
            <h3 className="text-lg font-semibold">Assign Department Manager</h3>
            <select className="w-full border rounded p-2" value={selectedManagerEffectiveId} onChange={(event) => setSelectedManagerId(event.target.value)}>
              <option value="">Select manager</option>
              {managerCandidates.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.firstName} {employee.lastName} ({employee.employeeId})
                </option>
              ))}
            </select>
            <button
              className="px-3 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-60"
              disabled={!selectedManagerEffectiveId || managerMutation.isPending}
              onClick={() => managerMutation.mutate(selectedManagerEffectiveId)}
            >
              {managerMutation.isPending ? 'Saving...' : 'Update Manager'}
            </button>
          </div>

          <div className="bg-white border rounded p-4 space-y-3">
            <h3 className="text-lg font-semibold">Assign User To Department</h3>
            <div className="grid grid-cols-1 gap-2">
              <select className="border rounded p-2" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as AssignableRole)}>
                {assignableRoleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select className="border rounded p-2" value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
                <option value="">Select employee/user</option>
                {assignableEmployees.map((employee: Employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName} - {employee.userId?.role || 'UNKNOWN'} ({employee.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Note: only users with employee profiles appear here. If HR admins are not listed, create their employee profile first.
            </p>
            <button
              className="px-3 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-60"
              disabled={!selectedEmployeeId || assignMutation.isPending}
              onClick={() => assignMutation.mutate({ employeeId: selectedEmployeeId, departmentId: params.id })}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign To This Department'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white border rounded overflow-auto">
        <div className="px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Department Members</h3>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-2">Employee ID</th>
              <th className="p-2">Name</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
              <th className="p-2">Designation</th>
            </tr>
          </thead>
          <tbody>
            {(departmentEmployees?.items || []).map((employee) => (
              <tr key={employee._id} className="border-t">
                <td className="p-2">{employee.employeeId}</td>
                <td className="p-2">
                  {employee.firstName} {employee.lastName}
                </td>
                <td className="p-2">{employee.userId?.role || '-'}</td>
                <td className="p-2">{employee.status}</td>
                <td className="p-2">{employee.designation || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
