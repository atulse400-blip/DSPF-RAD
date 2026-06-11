'use strict';
const { Router } = require('express');
const svc = require('../services/ibmiSvc');
const router = Router();

// GET /api/students
router.get('/', async (req, res) => {
  try {
    const students = await svc.getStudents({
      status: req.query.status,
      group:  req.query.group,
    });
    res.json({ success: true, data: students, count: students.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
  try {
    const student = await svc.getStudentById(req.params.id.toUpperCase());
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/:id/courses  - enrolled courses
router.get('/:id/courses', async (req, res) => {
  try {
    const enrollments = await svc.getEnrollments(req.params.id.toUpperCase());
    res.json({ success: true, data: enrollments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/:id/attendance  - attendance summary for this student
router.get('/:id/attendance', async (req, res) => {
  try {
    const summary = await svc.getAttendanceSummary({
      studentId: req.params.id.toUpperCase(),
      from: req.query.from,
      to:   req.query.to,
    });
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students
router.post('/', async (req, res) => {
  const { id, firstName, lastName, group, email, phone } = req.body;
  if (!id || !firstName || !lastName) {
    return res.status(400).json({ success: false, error: 'id, firstName, lastName are required' });
  }
  try {
    const student = await svc.createStudent({
      id: id.toUpperCase().trim().slice(0, 10),
      firstName, lastName, group: group||'', email: email||'', phone: phone||'',
    });
    res.status(201).json({ success: true, data: student, message: 'Student created' });
  } catch (err) {
    if (err.code === 'DUPLICATE') return res.status(409).json({ success: false, error: 'Student ID already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
  try {
    const student = await svc.updateStudent(req.params.id.toUpperCase(), req.body);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student, message: 'Student updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await svc.deleteStudent(req.params.id.toUpperCase());
    if (!deleted) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
