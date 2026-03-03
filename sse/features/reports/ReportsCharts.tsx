'use client';

import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export default function ReportsCharts({
  leaveTrend,
  payrollTrend,
}: {
  leaveTrend: { month: number; count: number }[];
  payrollTrend: { month: number; total: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="bg-white border rounded p-4 h-80">
        <h3 className="font-semibold mb-3">Leave Trend</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={leaveTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="bg-white border rounded p-4 h-80">
        <h3 className="font-semibold mb-3">Payroll Trend</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={payrollTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
