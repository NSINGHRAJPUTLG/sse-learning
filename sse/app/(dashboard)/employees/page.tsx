'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { deleteEmployee, getEmployees, updateEmployee, type Employee } from '@/services/employee.service';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/toast';
import Skeleton from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/auth.store';

export default function EmployeesPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const canManage = role === 'SUPER_ADMIN' || role === 'HR_ADMIN';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [editingDesignationId, setEditingDesignationId] = useState('');
  const [designationDraft, setDesignationDraft] = useState('');
  const [savingDesignationId, setSavingDesignationId] = useState('');
  const debounced = useDebouncedValue(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, debounced],
    queryFn: () => getEmployees({ page, limit: 10, search: debounced }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(''),
    onSuccess: () => {
      toast.success('Employee terminated successfully');
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to terminate employee')),
  });

  const designationMutation = useMutation({
    mutationFn: ({ id, designation }: { id: string; designation: string }) =>
      updateEmployee(id, { designation: designation.trim() }),
    onMutate: ({ id }) => setSavingDesignationId(id),
    onSettled: () => setSavingDesignationId(''),
    onSuccess: () => {
      toast.success('Designation updated successfully');
      setEditingDesignationId('');
      setDesignationDraft('');
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to update designation')),
  });

  function startDesignationEdit(emp: Employee) {
    setEditingDesignationId(emp._id);
    setDesignationDraft(emp.designation || '');
  }

  function cancelDesignationEdit() {
    setEditingDesignationId('');
    setDesignationDraft('');
  }

  function saveDesignation(empId: string) {
    designationMutation.mutate({ id: empId, designation: designationDraft });
  }

  if (isLoading) return <Skeleton className="h-36 w-full" />;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Employees</h2>
        <Link href="/employees/create" className="px-3 py-2 rounded bg-slate-900 text-white text-sm">Create Employee</Link>
      </div>

      <input
        className="w-full md:w-80 border rounded p-2"
        placeholder="Search by name or employee ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-2">Employee ID</th>
              <th className="p-2">Name</th>
              <th className="p-2">Designation</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((emp: Employee) => (
              <tr key={emp._id} className="border-t">
                <td className="p-2">{emp.employeeId}</td>
                <td className="p-2">{emp.firstName} {emp.lastName}</td>
                <td className="p-2">
                  {canManage && editingDesignationId === emp._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="border rounded p-1 text-sm w-40"
                        placeholder="Designation"
                        value={designationDraft}
                        onChange={(e) => setDesignationDraft(e.target.value)}
                      />
                      <button
                        className="text-blue-600 disabled:opacity-60"
                        disabled={designationMutation.isPending && savingDesignationId === emp._id}
                        onClick={() => saveDesignation(emp._id)}
                      >
                        {designationMutation.isPending && savingDesignationId === emp._id ? 'Saving...' : 'Save'}
                      </button>
                      <button className="text-slate-600" onClick={cancelDesignationEdit}>Cancel</button>
                    </div>
                  ) : (
                    <span>{emp.designation || '-'}</span>
                  )}
                </td>
                <td className="p-2">{emp.status}</td>
                <td className="p-2 space-x-2">
                  <Link href={`/employees/${emp._id}`} className="text-blue-600">View</Link>
                  <button
                    onClick={() => removeMutation.mutate(emp._id)}
                    disabled={removeMutation.isPending}
                    className="text-red-600 disabled:opacity-60"
                  >
                    {removeMutation.isPending && deletingId === emp._id ? 'Terminating...' : 'Terminate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-2 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <button className="px-3 py-2 border rounded" onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </section>
  );
}
