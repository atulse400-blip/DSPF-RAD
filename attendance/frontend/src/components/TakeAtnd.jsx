import React, { useEffect, useState, useCallback } from 'react';
import { studentsApi, coursesApi, attendanceApi } from '../services/api';

const STATUS_OPTS = [
  { value: 'P', label: 'Present', cls: 'status-present' },
  { value: 'A', label: 'Absent',  cls: 'status-absent'  },
  { value: 'L', label: 'Late',    cls: 'status-late'     },
  { value: 'E', label: 'Excused', cls: 'status-excused'  },
];

export default function TakeAtnd() {
  const [courses,    setCourses]    = useState([]);
  const [students,   setStudents]   = useState([]);
  const [selCourse,  setSelCourse]  = useState('');
  const [date,       setDate]       = useState(today());
  const [rows,       setRows]       = useState([]);
  const [existing,   setExisting]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    Promise.all([coursesApi.list({ status: 'A' }), studentsApi.list({ status: 'A' })])
      .then(([c, s]) => { setCourses(c.data || []); setStudents(s.data || []); });
  }, []);

  // When course or date changes, load existing attendance and rebuild rows
  useEffect(() => {
    if (!selCourse) { setRows([]); return; }
    setLoadingRec(true);
    setSaved(false);

    // Get enrolled students for this course
    const enrolled = students; // in demo mode, show all students

    attendanceApi.list({ course: selCourse, date }).then(r => {
      const existMap = {};
      (r.data || []).forEach(a => { existMap[a.studentId] = a; });
      setExisting(existMap);

      setRows(enrolled.map(s => ({
        studentId:   s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        group:       s.group,
        status:      existMap[s.id]?.status || 'P',
        notes:       existMap[s.id]?.notes  || '',
        recId:       existMap[s.id]?.id     || null,
      })));
    }).finally(() => setLoadingRec(false));
  }, [selCourse, date, students]);

  function setRowStatus(idx, status) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, status } : r));
  }
  function setRowNotes(idx, notes) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, notes  } : r));
  }
  function markAll(status) {
    setRows(prev => prev.map(r => ({ ...r, status })));
  }

  async function handleSubmit() {
    if (!selCourse || rows.length === 0) return;
    setSaving(true); setSaved(false);
    try {
      const payload = rows.map(r => ({
        studentId: r.studentId,
        courseId:  selCourse,
        status:    r.status,
        notes:     r.notes,
        date,
      }));
      await attendanceApi.bulk(payload);
      setSaved(true);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  const presentCount = rows.filter(r => r.status === 'P').length;
  const absentCount  = rows.filter(r => r.status === 'A').length;
  const lateCount    = rows.filter(r => r.status === 'L').length;

  return (
    <div className="page">
      <h1 className="page-title">Take Attendance</h1>

      <div className="take-controls">
        <label>Course
          <select value={selCourse} onChange={e => setSelCourse(e.target.value)} className="control-select">
            <option value="">-- Select Course --</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
          </select>
        </label>
        <label>Date
          <input type="date" value={date} max={today()}
                 onChange={e => setDate(e.target.value)} className="control-date" />
        </label>
      </div>

      {selCourse && (
        <>
          <div className="take-summary">
            <span className="take-stat status-present">{presentCount} Present</span>
            <span className="take-stat status-absent">{absentCount} Absent</span>
            <span className="take-stat status-late">{lateCount} Late</span>
            <span className="take-stat">{rows.length} Total</span>
          </div>

          <div className="bulk-actions">
            Mark all:
            {STATUS_OPTS.map(s => (
              <button key={s.value} className={`btn-sm ${s.cls}`} onClick={() => markAll(s.value)}>
                {s.label}
              </button>
            ))}
          </div>

          {loadingRec ? <div className="loading">Loading...</div> : (
            <div className="table-wrap">
              <table className="data-table attendance-table">
                <thead>
                  <tr><th>#</th><th>Student</th><th>Group</th><th>Status</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.studentId} className={`row-${r.status.toLowerCase()}`}>
                      <td className="row-num">{i + 1}</td>
                      <td>
                        <div className="cell-primary">{r.studentName}</div>
                        <div className="cell-sub"><code>{r.studentId}</code></div>
                      </td>
                      <td><span className="badge badge-blue">{r.group}</span></td>
                      <td>
                        <div className="status-btns">
                          {STATUS_OPTS.map(s => (
                            <button key={s.value}
                                    className={`status-btn ${s.cls} ${r.status === s.value ? 'active' : ''}`}
                                    onClick={() => setRowStatus(i, s.value)}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <input className="notes-input" value={r.notes}
                               placeholder="Optional note..."
                               onChange={e => setRowNotes(i, e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="take-footer">
            {saved && <span className="save-ok">Attendance saved successfully!</span>}
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={saving || rows.length === 0}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}

      {!selCourse && (
        <div className="empty-state">
          Select a course above to start taking attendance
        </div>
      )}
    </div>
  );
}

function today() {
  return new Date().toISOString().split('T')[0];
}
