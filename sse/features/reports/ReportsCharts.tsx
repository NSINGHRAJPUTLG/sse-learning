'use client';

import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function ReportsCharts({
  leaveTrend,
  payrollTrend,
}: {
  leaveTrend: { month: number; count: number }[];
  payrollTrend: { month: number; total: number }[];
}) {
  const { theme } = useTheme();
  const axisColor = theme === 'dark' ? '#cbd5e1' : '#334155';
  const gridColor = theme === 'dark' ? '#334155' : '#cbd5e1';
  const tooltipBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#334155' : '#cbd5e1';
  const tooltipText = theme === 'dark' ? '#e2e8f0' : '#0f172a';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="bg-white border rounded p-4 h-80">
        <h3 className="font-semibold mb-3">Leave Trend</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={leaveTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" stroke={axisColor} />
            <YAxis stroke={axisColor} />
            <Tooltip
              contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
              labelStyle={{ color: tooltipText }}
              itemStyle={{ color: tooltipText }}
            />
            <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="bg-white border rounded p-4 h-80">
        <h3 className="font-semibold mb-3">Payroll Trend</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={payrollTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" stroke={axisColor} />
            <YAxis stroke={axisColor} />
            <Tooltip
              contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
              labelStyle={{ color: tooltipText }}
              itemStyle={{ color: tooltipText }}
            />
            <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
