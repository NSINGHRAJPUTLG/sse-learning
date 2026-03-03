'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/services/reports.service';
import Skeleton from '@/components/ui/Skeleton';

const DashboardCharts = dynamic(() => import('@/features/reports/DashboardCharts'), { ssr: false });

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard() });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded p-4"><p className="text-xs text-slate-500">Total Employees</p><p className="text-xl font-semibold">{data?.employeeStats?.totalEmployees || 0}</p></div>
        <div className="bg-white border rounded p-4"><p className="text-xs text-slate-500">Pending Leaves</p><p className="text-xl font-semibold">{data?.pendingLeaveRequests || 0}</p></div>
        <div className="bg-white border rounded p-4"><p className="text-xs text-slate-500">Payroll This Month</p><p className="text-xl font-semibold">{data?.payrollThisMonth || 0}</p></div>
        <div className="bg-white border rounded p-4"><p className="text-xs text-slate-500">Attendance Buckets</p><p className="text-xl font-semibold">{data?.attendanceToday?.length || 0}</p></div>
      </div>
      <DashboardCharts attendanceToday={data?.attendanceToday || []} />
    </div>
  );
}
