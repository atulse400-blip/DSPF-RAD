import React, { useEffect, useState } from 'react';
import { studentsApi, coursesApi, attendanceApi } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const STATUS_COLORS = { P: '#22c55e', A: '#ef4444', L: '#f59e0b', E: '#3b82f6' };
const STATUS_NAMES  = { P: 'Present', A: 'Absent',  L: 'Late',    E: 'Excused' };

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      studentsApi.list({ status: 'A' }),
      coursesApi.list({ status: 'A' }),
      attendanceApi.summary(),
    ]).then(([stu, crs, sum]) => {
      const summaries = sum.data || [];
      const total     = summaries.reduce((a, s) => a + s.totalDays,   0);
      const present   = summaries.reduce((a, s) => a + s.presentDays, 0);
      const absent    = summaries.reduce((a, s) => a + s.absentDays,  0);
      const late      = summaries.reduce((a, s) => a + s.lateDays,    0);
      const excused   = summaries.reduce((a, s) => a + s.excusedDays, 0);

      // Top 5 students by attendance %
      const topStudents = Object.values(
        summaries.reduce((acc, s) => {
          if (!acc[s.studentId]) acc[s.studentId] = { name: s.studentName, group: s.group, total: 0, present: 0, late: 0 };
          acc[s.studentId].total   += s.totalDays;
          acc[s.studentId].present += s.presentDays;
          acc[s.studentId].late    += s.lateDays;
          return acc;
        }, {})
      ).map(s => ({ ...s, pct: s.total > 0 ? +((s.present + s.late) / s.total * 100).toFixed(1) : 0 }))
       .sort((a, b) => a.pct - b.pct)
       .slice(0, 8);

      setStats({
        studentCount: stu.count,
        courseCount:  crs.count,
        totalDays: total,
        overallPct: total > 0 ? +((present + late) / total * 100).toFixed(1) : 0,
        pieData: [
          { name: 'Present', value: present, color: STATUS_COLORS.P },
          { name: 'Absent',  value: absent,  color: STATUS_COLORS.A },
          { name: 'Late',    value: late,    color: STATUS_COLORS.L },
          { name: 'Excused', value: excused, color: STATUS_COLORS.E },
        ],
        topStudents,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!stats)  return <div className="error">Failed to load dashboard</div>;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-grid">
        <StatCard label="Active Students" value={stats.studentCount} icon="👤" color="blue" />
        <StatCard label="Active Courses"  value={stats.courseCount}  icon="📚" color="purple" />
        <StatCard label="Overall Attendance" value={`${stats.overallPct}%`} icon="✅" color="green" />
        <StatCard label="Total Records"   value={stats.totalDays}    icon="📋" color="orange" />
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h2 className="chart-title">Attendance Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.pieData} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) =>
                     `${name} ${(percent * 100).toFixed(0)}%`}>
                {stats.pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Attendance % by Student (Bottom 8)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.topStudents} layout="vertical"
                      margin={{ left: 90, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" width={90}
                     tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="pct" name="Attendance %">
                {stats.topStudents.map((s, i) => (
                  <Cell key={i} fill={s.pct >= 75 ? '#22c55e' : s.pct >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
