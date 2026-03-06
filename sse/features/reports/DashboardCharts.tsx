'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function DashboardCharts({ attendanceToday }: { attendanceToday: { _id: string; count: number }[] }) {
  const { theme } = useTheme();
  const axisColor = theme === 'dark' ? '#cbd5e1' : '#334155';
  const tooltipBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#334155' : '#cbd5e1';
  const tooltipText = theme === 'dark' ? '#e2e8f0' : '#0f172a';

  return (
    <section className="bg-white border rounded p-4 h-80">
      <h3 className="font-semibold mb-4">Attendance Today</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={attendanceToday}>
          <XAxis dataKey="_id" stroke={axisColor} />
          <YAxis stroke={axisColor} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
            labelStyle={{ color: tooltipText }}
            itemStyle={{ color: tooltipText }}
          />
          <Bar dataKey="count" fill="#0f172a" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
