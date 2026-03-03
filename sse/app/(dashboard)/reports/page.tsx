'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { getAttendanceSummary, getEmployeeStats, getLeaveSummary, getPayrollSummary } from '@/services/reports.service';
import Skeleton from '@/components/ui/Skeleton';

const ReportsCharts = dynamic(() => import('@/features/reports/ReportsCharts'), { ssr: false });

export default function ReportsPage() {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const employeeStats = useQuery({ queryKey: ['r-employee', year], queryFn: () => getEmployeeStats() });
  const attendance = useQuery({ queryKey: ['r-attendance', month, year], queryFn: () => getAttendanceSummary({ month, year }) });
  const leave = useQuery({ queryKey: ['r-leave', year], queryFn: () => getLeaveSummary({ year }) });
  const payroll = useQuery({ queryKey: ['r-payroll', year], queryFn: () => getPayrollSummary({ year }) });

  if (employeeStats.isLoading || attendance.isLoading || leave.isLoading || payroll.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Reports</h2>
      <div className="grid md:grid-cols-4 gap-3">
        <div className="bg-white border rounded p-4"><p className="text-xs">Employees</p><p className="text-xl font-semibold">{employeeStats.data?.totalEmployees || 0}</p></div>
        <div className="bg-white border rounded p-4"><p className="text-xs">Present</p><p className="text-xl font-semibold">{attendance.data?.totalPresent || 0}</p></div>
        <div className="bg-white border rounded p-4"><p className="text-xs">Leaves</p><p className="text-xl font-semibold">{leave.data?.totalLeavesApplied || 0}</p></div>
        <div className="bg-white border rounded p-4"><p className="text-xs">Net Paid</p><p className="text-xl font-semibold">{payroll.data?.totalNetPaid || 0}</p></div>
      </div>
      <ReportsCharts leaveTrend={leave.data?.monthlyLeaveTrend || []} payrollTrend={payroll.data?.monthlyPayrollTrend || []} />
    </section>
  );
}
