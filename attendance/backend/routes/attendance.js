'use strict';
const { Router } = require('express');
const svc = require('../services/ibmiSvc');
const router = Router();

// GET /api/attendance  - list with optional filters
router.get('/', async (req, res) => {
  try {
    const records = await svc.getAttendance({
      studentId: req.query.student,
      courseId:  req.query.course,
      date:      req.query.date,
      from:      req.query.from,
      to:        req.query.to,
      status:    req.query.status,
    });
    res.json({ success: true, data: records, count: records.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/attendance/summary  - aggregated stats
router.get('/summary', async (req, res) => {
  try {
    const summary = await svc.getAttendanceSummary({
      studentId: req.query.student,
      courseId:  req.query.course,
      from:      req.query.from,
      to:        req.query.to,
    });
    res.json({ success: true, data: summary, count: summary.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/attendance/:id
router.get('/:id', async (req, res) => {
  try {
    const record = await svc.getAttendanceById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/attendance  - single record or bulk array
router.post('/', async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      // Bulk create: [{studentId, courseId, status, notes}, ...]
      const results = await svc.bulkCreateAttendance(req.body);
      res.status(201).json({ success: true, data: results, message: 'Bulk attendance saved' });
    } else {
      const { studentId, courseId, status } = req.body;
      if (!studentId || !courseId) {
        return res.status(400).json({ success: false, error: 'studentId and courseId are required' });
      }
      const record = await svc.createAttendance({
        studentId: studentId.toUpperCase(),
        courseId:  courseId.toUpperCase(),
        status:    status || 'P',
        notes:     req.body.notes || '',
        date:      req.body.date,
      });
      res.status(201).json({ success: true, data: record, message: 'Attendance recorded' });
    }
  } catch (err) {
    if (err.code === 'DUPLICATE') return res.status(409).json({ success: false, error: 'Attendance already recorded for this date' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/attendance/:id  - update status/notes
router.put('/:id', async (req, res) => {
  const { status, notes } = req.body;
  if (!status) return res.status(400).json({ success: false, error: 'status is required' });
  if (!['P','A','L','E'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status must be P A L or E' });
  }
  try {
    const record = await svc.updateAttendance(req.params.id, { status, notes: notes||'' });
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, data: record, message: 'Attendance updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/attendance/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await svc.deleteAttendance(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
