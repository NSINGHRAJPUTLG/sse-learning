'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeById } from '@/services/employee.service';
import Skeleton from '@/components/ui/Skeleton';

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['employee', params.id],
    queryFn: () => getEmployeeById(params.id),
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;

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
