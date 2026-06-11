'use strict';
/**
 * ibmiSvc.js - IBM i DB2 connectivity service
 *
 * In production (USE_MOCK=false):
 *   Uses the `odbc` npm package with the IBM i Access ODBC driver.
 *   Install: npm install odbc
 *   Driver:  IBM i Access Client Solutions - ODBC Driver
 *   DSN config in /etc/odbc.ini or odbcinst.ini
 *
 * In development (USE_MOCK=true):
 *   Uses in-memory mock data that mirrors the IBM i DB2 schema.
 */

const mock = require('../data/mockData');

const USE_MOCK = process.env.USE_MOCK !== 'false';

let pool = null;

async function getPool() {
  if (USE_MOCK) return null;
  if (pool) return pool;

  const odbc = require('odbc');
  const connStr = process.env.IBMI_DSN
    ? `DSN=${process.env.IBMI_DSN};`
    : `DRIVER={IBM i Access ODBC Driver};` +
      `SYSTEM=${process.env.IBMI_HOST};` +
      `UID=${process.env.IBMI_USER};` +
      `PWD=${process.env.IBMI_PASSWORD};` +
      `DBQ=${process.env.IBMI_LIBRARY};`;

  pool = await odbc.pool(connStr);
  return pool;
}

async function query(sql, params = []) {
  if (USE_MOCK) {
    throw new Error('Direct SQL not supported in mock mode – use service methods');
  }
  const p = await getPool();
  const conn = await p.connect();
  try {
    return await conn.query(sql, params);
  } finally {
    await conn.close();
  }
}

// ---- Students ----

async function getStudents(filter = {}) {
  if (USE_MOCK) {
    let rows = [...mock.students];
    if (filter.status) rows = rows.filter(s => s.status === filter.status);
    if (filter.group)  rows = rows.filter(s => s.group  === filter.group);
    return rows;
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  let sql = `SELECT STUID,STUFNM,STULNM,STUGRP,STUEML,STUPHONE,STUSTS,
                    CHAR(STUCRDT,ISO)
             FROM ${lib}.STUDNTPF WHERE 1=1`;
  const params = [];
  if (filter.status) { sql += ` AND STUSTS=?`;  params.push(filter.status); }
  if (filter.group)  { sql += ` AND STUGRP=?`;  params.push(filter.group);  }
  sql += ' ORDER BY STULNM, STUFNM';
  const rows = await query(sql, params);
  return rows.map(r => ({
    id: r[0].trim(), firstName: r[1], lastName: r[2],
    group: r[3], email: r[4], phone: r[5],
    status: r[6], createdDate: r[7],
  }));
}

async function getStudentById(id) {
  if (USE_MOCK) return mock.students.find(s => s.id === id) || null;
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  const rows = await query(
    `SELECT STUID,STUFNM,STULNM,STUGRP,STUEML,STUPHONE,STUSTS,CHAR(STUCRDT,ISO)
     FROM ${lib}.STUDNTPF WHERE STUID=?`, [id]);
  if (!rows.length) return null;
  const r = rows[0];
  return { id: r[0].trim(), firstName: r[1], lastName: r[2],
           group: r[3], email: r[4], phone: r[5],
           status: r[6], createdDate: r[7] };
}

async function createStudent(data) {
  if (USE_MOCK) {
    if (mock.students.find(s => s.id === data.id)) {
      const err = new Error('Duplicate student ID'); err.code = 'DUPLICATE'; throw err;
    }
    const rec = { ...data, status: 'A', createdDate: new Date().toISOString().split('T')[0] };
    mock.students.push(rec);
    return rec;
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  await query(
    `INSERT INTO ${lib}.STUDNTPF (STUID,STUFNM,STULNM,STUGRP,STUEML,STUPHONE,STUSTS,STUCRDT)
     VALUES (?,?,?,?,?,?,'A',CURRENT_DATE)`,
    [data.id, data.firstName, data.lastName, data.group||'', data.email||'', data.phone||'']);
  return data;
}

async function updateStudent(id, data) {
  if (USE_MOCK) {
    const idx = mock.students.findIndex(s => s.id === id);
    if (idx === -1) return null;
    mock.students[idx] = { ...mock.students[idx], ...data };
    return mock.students[idx];
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  await query(
    `UPDATE ${lib}.STUDNTPF SET STUFNM=?,STULNM=?,STUGRP=?,STUEML=?,STUPHONE=?,STUSTS=?
     WHERE STUID=?`,
    [data.firstName, data.lastName, data.group||'', data.email||'',
     data.phone||'', data.status||'A', id]);
  return { id, ...data };
}

async function deleteStudent(id) {
  if (USE_MOCK) {
    const idx = mock.students.findIndex(s => s.id === id);
    if (idx === -1) return false;
    mock.students.splice(idx, 1);
    mock.enrollments.splice(0, mock.enrollments.length,
      ...mock.enrollments.filter(e => e.studentId !== id));
    mock.attendance.splice(0, mock.attendance.length,
      ...mock.attendance.filter(a => a.studentId !== id));
    return true;
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  const result = await query(`DELETE FROM ${lib}.STUDNTPF WHERE STUID=?`, [id]);
  return result.count > 0;
}

// ---- Courses ----

async function getCourses(filter = {}) {
  if (USE_MOCK) {
    let rows = [...mock.courses];
    if (filter.status) rows = rows.filter(c => c.status === filter.status);
    return rows;
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  let sql = `SELECT CRSID,CRSNM,CRSDSC,CRSINST,CRSSCHED,CRSROOM,CRSSTS,CHAR(CRSCRDT,ISO)
             FROM ${lib}.COURSEPF WHERE 1=1`;
  const params = [];
  if (filter.status) { sql += ` AND CRSSTS=?`; params.push(filter.status); }
  sql += ' ORDER BY CRSNM';
  const rows = await query(sql, params);
  return rows.map(r => ({
    id: r[0].trim(), name: r[1], description: r[2],
    instructor: r[3], schedule: r[4], room: r[5].trim(),
    status: r[6], createdDate: r[7],
  }));
}

async function getCourseById(id) {
  if (USE_MOCK) return mock.courses.find(c => c.id === id) || null;
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  const rows = await query(
    `SELECT CRSID,CRSNM,CRSDSC,CRSINST,CRSSCHED,CRSROOM,CRSSTS,CHAR(CRSCRDT,ISO)
     FROM ${lib}.COURSEPF WHERE CRSID=?`, [id]);
  if (!rows.length) return null;
  const r = rows[0];
  return { id: r[0].trim(), name: r[1], description: r[2],
           instructor: r[3], schedule: r[4], room: r[5].trim(),
           status: r[6], createdDate: r[7] };
}

async function createCourse(data) {
  if (USE_MOCK) {
    if (mock.courses.find(c => c.id === data.id)) {
      const err = new Error('Duplicate course ID'); err.code = 'DUPLICATE'; throw err;
    }
    const rec = { ...data, status: 'A', createdDate: new Date().toISOString().split('T')[0] };
    mock.courses.push(rec);
    return rec;
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  await query(
    `INSERT INTO ${lib}.COURSEPF (CRSID,CRSNM,CRSDSC,CRSINST,CRSSCHED,CRSROOM,CRSSTS,CRSCRDT)
     VALUES (?,?,?,?,?,?,'A',CURRENT_DATE)`,
    [data.id, data.name, data.description||'', data.instructor||'',
     data.schedule||'', data.room||'']);
  return data;
}

async function updateCourse(id, data) {
  if (USE_MOCK) {
    const idx = mock.courses.findIndex(c => c.id === id);
    if (idx === -1) return null;
    mock.courses[idx] = { ...mock.courses[idx], ...data };
    return mock.courses[idx];
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  await query(
    `UPDATE ${lib}.COURSEPF SET CRSNM=?,CRSDSC=?,CRSINST=?,CRSSCHED=?,CRSROOM=?,CRSSTS=?
     WHERE CRSID=?`,
    [data.name, data.description||'', data.instructor||'',
     data.schedule||'', data.room||'', data.status||'A', id]);
  return { id, ...data };
}

async function deleteCourse(id) {
  if (USE_MOCK) {
    const idx = mock.courses.findIndex(c => c.id === id);
    if (idx === -1) return false;
    mock.courses.splice(idx, 1);
    return true;
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  const result = await query(`DELETE FROM ${lib}.COURSEPF WHERE CRSID=?`, [id]);
  return result.count > 0;
}

// ---- Attendance ----

async function getAttendance(filter = {}) {
  if (USE_MOCK) {
    let rows = mock.attendance.map(a => {
      const stu = mock.students.find(s => s.id === a.studentId) || {};
      const crs = mock.courses.find(c => c.id === a.courseId)   || {};
      const statusNames = { P:'Present', A:'Absent', L:'Late', E:'Excused' };
      return {
        ...a,
        studentName: `${stu.firstName||''} ${stu.lastName||''}`.trim(),
        group: stu.group || '',
        courseName: crs.name || '',
        statusName: statusNames[a.status] || a.status,
      };
    });
    if (filter.studentId) rows = rows.filter(r => r.studentId === filter.studentId);
    if (filter.courseId)  rows = rows.filter(r => r.courseId  === filter.courseId);
    if (filter.date)      rows = rows.filter(r => r.date      === filter.date);
    if (filter.from)      rows = rows.filter(r => r.date      >= filter.from);
    if (filter.to)        rows = rows.filter(r => r.date      <= filter.to);
    if (filter.status)    rows = rows.filter(r => r.status    === filter.status);
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  let sql = `SELECT A.ATNDID,A.ATNDSTU,
                    TRIM(S.STUFNM)||' '||TRIM(S.STULNM),S.STUGRP,
                    A.ATNDCRS,C.CRSNM,
                    CHAR(A.ATNDDT,ISO),CHAR(A.ATNDTM,ISO),A.ATNDSTS,
                    CASE A.ATNDSTS WHEN 'P' THEN 'Present' WHEN 'A' THEN 'Absent'
                      WHEN 'L' THEN 'Late' WHEN 'E' THEN 'Excused' ELSE 'Unknown' END,
                    A.ATNDNTS
             FROM ${lib}.ATNDRECPF A
             JOIN ${lib}.STUDNTPF  S ON A.ATNDSTU=S.STUID
             JOIN ${lib}.COURSEPF  C ON A.ATNDCRS=C.CRSID
             WHERE 1=1`;
  const params = [];
  if (filter.studentId) { sql += ` AND A.ATNDSTU=?`;              params.push(filter.studentId); }
  if (filter.courseId)  { sql += ` AND A.ATNDCRS=?`;              params.push(filter.courseId);  }
  if (filter.date)      { sql += ` AND CHAR(A.ATNDDT,ISO)=?`;     params.push(filter.date);      }
  if (filter.from)      { sql += ` AND CHAR(A.ATNDDT,ISO)>=?`;    params.push(filter.from);      }
  if (filter.to)        { sql += ` AND CHAR(A.ATNDDT,ISO)<=?`;    params.push(filter.to);        }
  if (filter.status)    { sql += ` AND A.ATNDSTS=?`;              params.push(filter.status);    }
  sql += ' ORDER BY A.ATNDDT DESC, S.STULNM';
  const rows = await query(sql, params);
  return rows.map(r => ({
    id: r[0].trim(), studentId: r[1].trim(), studentName: r[2],
    group: r[3], courseId: r[4].trim(), courseName: r[5],
    date: r[6], time: r[7], status: r[8], statusName: r[9], notes: r[10],
  }));
}

async function getAttendanceById(id) {
  if (USE_MOCK) {
    const a = mock.attendance.find(r => r.id === id);
    if (!a) return null;
    const stu = mock.students.find(s => s.id === a.studentId) || {};
    const crs = mock.courses.find(c => c.id === a.courseId)   || {};
    return { ...a,
      studentName: `${stu.firstName||''} ${stu.lastName||''}`.trim(),
      courseName:  crs.name || '' };
  }
  const rows = await getAttendance({ id });
  return rows[0] || null;
}

async function createAttendance(data) {
  if (USE_MOCK) {
    const existing = mock.attendance.find(
      a => a.studentId === data.studentId &&
           a.courseId  === data.courseId  &&
           a.date      === (data.date || new Date().toISOString().split('T')[0])
    );
    if (existing) {
      const err = new Error('Attendance already recorded for this date');
      err.code = 'DUPLICATE'; throw err;
    }
    const newId = 'A' + String(mock.attendance.length + 1).padStart(7, '0');
    const today = new Date().toISOString().split('T')[0];
    const rec = {
      id: newId,
      studentId:   data.studentId,
      courseId:    data.courseId,
      date:        data.date  || today,
      time:        data.time  || new Date().toTimeString().split(' ')[0],
      status:      data.status || 'P',
      notes:       data.notes  || '',
      createdDate: today,
    };
    mock.attendance.push(rec);
    return rec;
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  const rows = await query(
    `SELECT 'A'||LPAD(CHAR(COALESCE(MAX(INTEGER(SUBSTR(ATNDID,2))),0)+1),7,'0')
     FROM ${lib}.ATNDRECPF`);
  const newId = rows[0][0];
  await query(
    `INSERT INTO ${lib}.ATNDRECPF (ATNDID,ATNDSTU,ATNDCRS,ATNDDT,ATNDTM,ATNDSTS,ATNDNTS,ATNDCRDT)
     VALUES (?,?,?,CURRENT_DATE,CURRENT_TIME,?,?,CURRENT_DATE)`,
    [newId, data.studentId, data.courseId, data.status||'P', data.notes||'']);
  return { id: newId, ...data };
}

async function bulkCreateAttendance(records) {
  const results = [];
  for (const rec of records) {
    try {
      const created = await createAttendance(rec);
      results.push({ success: true, id: created.id, studentId: rec.studentId });
    } catch (err) {
      if (err.code === 'DUPLICATE') {
        // Update existing record for today
        const existing = mock.attendance.find(
          a => a.studentId === rec.studentId &&
               a.courseId  === rec.courseId  &&
               a.date      === (rec.date || new Date().toISOString().split('T')[0])
        );
        if (existing) {
          existing.status = rec.status;
          existing.notes  = rec.notes || '';
          results.push({ success: true, id: existing.id, studentId: rec.studentId, updated: true });
        }
      } else {
        results.push({ success: false, studentId: rec.studentId, error: err.message });
      }
    }
  }
  return results;
}

async function updateAttendance(id, data) {
  if (USE_MOCK) {
    const idx = mock.attendance.findIndex(a => a.id === id);
    if (idx === -1) return null;
    mock.attendance[idx] = { ...mock.attendance[idx], ...data };
    return mock.attendance[idx];
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  await query(
    `UPDATE ${lib}.ATNDRECPF SET ATNDSTS=?,ATNDNTS=? WHERE ATNDID=?`,
    [data.status, data.notes||'', id]);
  return { id, ...data };
}

async function deleteAttendance(id) {
  if (USE_MOCK) {
    const idx = mock.attendance.findIndex(a => a.id === id);
    if (idx === -1) return false;
    mock.attendance.splice(idx, 1);
    return true;
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  const result = await query(`DELETE FROM ${lib}.ATNDRECPF WHERE ATNDID=?`, [id]);
  return result.count > 0;
}

// ---- Summary ----

async function getAttendanceSummary(filter = {}) {
  if (USE_MOCK) {
    let rows = mock.attendance;
    if (filter.studentId) rows = rows.filter(r => r.studentId === filter.studentId);
    if (filter.courseId)  rows = rows.filter(r => r.courseId  === filter.courseId);
    if (filter.from)      rows = rows.filter(r => r.date      >= filter.from);
    if (filter.to)        rows = rows.filter(r => r.date      <= filter.to);

    const grouped = {};
    for (const r of rows) {
      const key = `${r.studentId}__${r.courseId}`;
      if (!grouped[key]) {
        const stu = mock.students.find(s => s.id === r.studentId) || {};
        const crs = mock.courses.find(c => c.id === r.courseId)   || {};
        grouped[key] = {
          studentId:   r.studentId,
          studentName: `${stu.firstName||''} ${stu.lastName||''}`.trim(),
          group:       stu.group || '',
          courseId:    r.courseId,
          courseName:  crs.name || '',
          totalDays:   0, presentDays: 0, absentDays: 0,
          lateDays: 0, excusedDays: 0,
        };
      }
      const g = grouped[key];
      g.totalDays++;
      if (r.status === 'P') g.presentDays++;
      if (r.status === 'A') g.absentDays++;
      if (r.status === 'L') g.lateDays++;
      if (r.status === 'E') g.excusedDays++;
    }

    return Object.values(grouped).map(g => ({
      ...g,
      attendancePct: g.totalDays > 0
        ? +((g.presentDays + g.lateDays) / g.totalDays * 100).toFixed(2)
        : 0,
    })).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }

  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  let sql = `SELECT A.ATNDSTU,TRIM(S.STUFNM)||' '||TRIM(S.STULNM),S.STUGRP,
                    A.ATNDCRS,C.CRSNM,
                    COUNT(*),
                    SUM(CASE WHEN A.ATNDSTS='P' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN A.ATNDSTS='A' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN A.ATNDSTS='L' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN A.ATNDSTS='E' THEN 1 ELSE 0 END),
                    DECIMAL(SUM(CASE WHEN A.ATNDSTS IN ('P','L') THEN 1 ELSE 0 END)*100.0
                      /NULLIF(COUNT(*),0),5,2)
             FROM ${lib}.ATNDRECPF A
             JOIN ${lib}.STUDNTPF  S ON A.ATNDSTU=S.STUID
             JOIN ${lib}.COURSEPF  C ON A.ATNDCRS=C.CRSID
             WHERE 1=1`;
  const params = [];
  if (filter.studentId) { sql += ` AND A.ATNDSTU=?`;          params.push(filter.studentId); }
  if (filter.courseId)  { sql += ` AND A.ATNDCRS=?`;          params.push(filter.courseId);  }
  if (filter.from)      { sql += ` AND CHAR(A.ATNDDT,ISO)>=?`;params.push(filter.from);      }
  if (filter.to)        { sql += ` AND CHAR(A.ATNDDT,ISO)<=?`;params.push(filter.to);        }
  sql += ` GROUP BY A.ATNDSTU,S.STUFNM,S.STULNM,S.STUGRP,A.ATNDCRS,C.CRSNM
           ORDER BY S.STULNM,S.STUFNM,C.CRSNM`;
  const rows = await query(sql, params);
  return rows.map(r => ({
    studentId: r[0].trim(), studentName: r[1], group: r[2],
    courseId:  r[3].trim(), courseName:  r[4],
    totalDays: +r[5], presentDays: +r[6], absentDays: +r[7],
    lateDays:  +r[8], excusedDays: +r[9], attendancePct: +r[10],
  }));
}

// ---- Enrollments ----
async function getEnrollments(studentId) {
  if (USE_MOCK) {
    return mock.enrollments
      .filter(e => e.studentId === studentId && e.status === 'A')
      .map(e => {
        const crs = mock.courses.find(c => c.id === e.courseId) || {};
        return { ...e, courseName: crs.name, courseInstructor: crs.instructor };
      });
  }
  const lib = process.env.IBMI_LIBRARY || 'ATTNDLIB';
  const rows = await query(
    `SELECT E.ENRLSTU,E.ENRLCRS,C.CRSNM,C.CRSINST,E.ENRLSTS
     FROM ${lib}.STUCRSEPF E
     JOIN ${lib}.COURSEPF  C ON E.ENRLCRS=C.CRSID
     WHERE E.ENRLSTU=? AND E.ENRLSTS='A'
     ORDER BY C.CRSNM`, [studentId]);
  return rows.map(r => ({
    studentId: r[0].trim(), courseId: r[1].trim(),
    courseName: r[2], courseInstructor: r[3], status: r[4],
  }));
}

module.exports = {
  getStudents, getStudentById, createStudent, updateStudent, deleteStudent,
  getCourses, getCourseById, createCourse, updateCourse, deleteCourse,
  getAttendance, getAttendanceById, createAttendance, bulkCreateAttendance,
  updateAttendance, deleteAttendance,
  getAttendanceSummary, getEnrollments,
};
