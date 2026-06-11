import React, { useEffect, useState, useCallback } from 'react';
import { studentsApi, coursesApi, attendanceApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, CartesianGrid,
} from 'recharts';

export default function Reports() {
  const [students,  setStudents]  = useState([]);
  const [courses,   setCourses]   = useState([]);
  const [summary,   setSummary]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [filter,    setFilter]    = useState({ student: '', course: '', from: '', to: '' });
  const [view,      setView]      = useState('table'); // 'table' | 'chart'
  const [sortField, setSortField] = useState('studentName');
  const [sortDir,   setSortDir]   = useState('asc');

  useEffect(() => {
    Promise.all([studentsApi.list(), coursesApi.list()]).then(([s, c]) => {
      setStudents(s.data || []);
      setCourses(c.data || []);
    });
    loadSummary({});
  }, []);

  function loadSummary(f) {
    setLoading(true);
    const params = {};
    if (f.student) params.student = f.student;
    if (f.course)  params.course  = f.course;
    if (f.from)    params.from    = f.from;
    if (f.to)      params.to      = f.to;
    attendanceApi.summary(params)
      .then(r => setSummary(r.data || []))
      .finally(() => setLoading(false));
  }

  function handleFilter(e) {
    e.preventDefault();
    loadSummary(filter);
  }

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field); setSortDir('asc');
    }
  }

  const sorted = [...summary].sort((a, b) => {
    const av = a[sortField] ?? 0;
    const bv = b[sortField] ?? 0;
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const chartData = sorted.slice(0, 20).map(s => ({
    name:  s.studentName.split(' ')[0] + '\n' + s.courseName.slice(0, 8),
    pct:   s.attendancePct,
    color: s.attendancePct >= 75 ? '#22c55e' : s.attendancePct >= 50 ? '#f59e0b' : '#ef4444',
  }));

  function pctColor(pct) {
    if (pct >= 75) return 'good';
    if (pct >= 50) return 'warn';
    return 'bad';
  }

  function sortArrow(field) {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  return (
    <div className="page">
      <h1 className="page-title">Attendance Reports</h1>

      <form className="filter-bar" onSubmit={handleFilter}>
        <label>Student
          <select value={filter.student} onChange={e => setFilter({...filter, student: e.target.value})}>
            <option value="">All Students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </select>
        </label>
        <label>Course
          <select value={filter.course} onChange={e => setFilter({...filter, course: e.target.value})}>
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>From
          <input type="date" value={filter.from} onChange={e => setFilter({...filter, from: e.target.value})} />
        </label>
        <label>To
          <input type="date" value={filter.to} onChange={e => setFilter({...filter, to: e.target.value})} />
        </label>
        <button type="submit" className="btn btn-primary">Apply</button>
        <button type="button" className="btn" onClick={() => { setFilter({student:'',course:'',from:'',to:''}); loadSummary({}); }}>
          Reset
        </button>
      </form>

      <div className="report-toolbar">
        <span className="result-count">{summary.length} records</span>
        <div className="view-toggle">
          <button className={`btn-sm ${view==='table'?'active':''}`} onClick={() => setView('table')}>Table</button>
          <button className={`btn-sm ${view==='chart'?'active':''}`} onClick={() => setView('chart')}>Chart</button>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {!loading && view === 'chart' && (
        <div className="chart-card" style={{ height: 400 }}>
          <h2 className="chart-title">Attendance % (top 20)</h2>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chartData} margin={{ bottom: 60, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => `${v}%`} />
              <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" label="75%" />
              <Bar dataKey="pct" name="Attendance %">
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && view === 'table' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('studentName')} className="sortable">Student{sortArrow('studentName')}</th>
                <th onClick={() => toggleSort('group')} className="sortable">Group{sortArrow('group')}</th>
                <th onClick={() => toggleSort('courseName')} className="sortable">Course{sortArrow('courseName')}</th>
                <th onClick={() => toggleSort('totalDays')} className="sortable">Total{sortArrow('totalDays')}</th>
                <th>Present</th><th>Absent</th><th>Late</th><th>Excused</th>
                <th onClick={() => toggleSort('attendancePct')} className="sortable">Att%{sortArrow('attendancePct')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0
                ? <tr><td colSpan={9} className="empty">No data found</td></tr>
                : sorted.map((s, i) => (
                  <tr key={i}>
                    <td>{s.studentName}<br/><code style={{fontSize:'0.75em'}}>{s.studentId}</code></td>
                    <td><span className="badge badge-blue">{s.group}</span></td>
                    <td>{s.courseName}</td>
                    <td className="num">{s.totalDays}</td>
                    <td className="num">{s.presentDays}</td>
                    <td className="num">{s.absentDays}</td>
                    <td className="num">{s.lateDays}</td>
                    <td className="num">{s.excusedDays}</td>
                    <td className="num">
                      <span className={`pct-badge pct-${pctColor(s.attendancePct)}`}>
                        {s.attendancePct}%
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
