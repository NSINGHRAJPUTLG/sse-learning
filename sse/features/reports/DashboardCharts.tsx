'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function DashboardCharts({ attendanceToday }: { attendanceToday: { _id: string; count: number }[] }) {
  return (
    <section className="bg-white border rounded p-4 h-80">
      <h3 className="font-semibold mb-4">Attendance Today</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={attendanceToday}>
          <XAxis dataKey="_id" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#0f172a" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
