'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Skeleton from '@/components/ui/Skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/toast';
import { deleteDepartment, getDepartments, type DepartmentManager } from '@/services/department.service';
import { useAuthStore } from '@/store/auth.store';

function managerLabel(manager: string | DepartmentManager | null | undefined) {
  if (!manager || typeof manager === 'string') return '-';
  const fullName = `${manager.firstName || ''} ${manager.lastName || ''}`.trim();
  return fullName || manager.employeeId || '-';
}

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const canManage = role === 'SUPER_ADMIN' || role === 'HR_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [deletingId, setDeletingId] = useState('');

  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['departments', page, debouncedSearch, activeFilter],
    queryFn: () => {
      const params: Record<string, string | number | boolean> = { page, limit: 10, search: debouncedSearch };
      if (activeFilter !== 'ALL') {
        params.isActive = activeFilter === 'ACTIVE';
      }
      return getDepartments(params);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(''),
    onSuccess: () => {
      toast.success('Department deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to deactivate department'));
    },
  });

  if (isLoading) return <Skeleton className="h-36 w-full" />;

  const totalPages = data?.pagination.totalPages || 1;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Departments</h2>
        {canManage ? (
          <Link href="/departments/create" className="px-3 py-2 rounded bg-slate-900 text-white text-sm">
            Create Department
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="w-full md:w-80 border rounded p-2"
          placeholder="Search departments"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
        <select
          className="border rounded p-2"
          value={activeFilter}
          onChange={(event) => {
            setPage(1);
            setActiveFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
          }}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ALL">All</option>
        </select>
      </div>

      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Manager</th>
              <th className="p-2">Status</th>
              <th className="p-2">Updated</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((department) => (
              <tr key={department._id} className="border-t">
                <td className="p-2">
                  <p className="font-medium">{department.name}</p>
                  <p className="text-xs text-slate-500">{department.description || 'No description'}</p>
                </td>
                <td className="p-2">{managerLabel(department.managerId)}</td>
                <td className="p-2">{department.isActive ? 'ACTIVE' : 'INACTIVE'}</td>
                <td className="p-2">{new Date(department.updatedAt).toLocaleDateString()}</td>
                <td className="p-2 space-x-2">
                  <Link href={`/departments/${department._id}`} className="text-blue-600">
                    View
                  </Link>
                  {canManage && department.isActive ? (
                    <button
                      className="text-red-600 disabled:opacity-60"
                      disabled={deactivateMutation.isPending}
                      onClick={() => deactivateMutation.mutate(department._id)}
                    >
                      {deactivateMutation.isPending && deletingId === department._id ? 'Deactivating...' : 'Deactivate'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 border rounded disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Prev
        </button>
        <span className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </span>
        <button
          className="px-3 py-2 border rounded disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
