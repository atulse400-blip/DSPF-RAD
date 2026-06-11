'use strict';
const { Router } = require('express');
const svc = require('../services/ibmiSvc');
const router = Router();

// GET /api/courses
router.get('/', async (req, res) => {
  try {
    const courses = await svc.getCourses({ status: req.query.status });
    res.json({ success: true, data: courses, count: courses.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/courses/:id
router.get('/:id', async (req, res) => {
  try {
    const course = await svc.getCourseById(req.params.id.toUpperCase());
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/courses/:id/summary  - attendance summary for this course
router.get('/:id/summary', async (req, res) => {
  try {
    const summary = await svc.getAttendanceSummary({
      courseId: req.params.id.toUpperCase(),
      from: req.query.from,
      to:   req.query.to,
    });
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/courses
router.post('/', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ success: false, error: 'id and name are required' });
  }
  try {
    const course = await svc.createCourse({
      id: id.toUpperCase().trim().slice(0, 10),
      name, description: req.body.description||'',
      instructor: req.body.instructor||'',
      schedule:   req.body.schedule||'',
      room:       req.body.room||'',
    });
    res.status(201).json({ success: true, data: course, message: 'Course created' });
  } catch (err) {
    if (err.code === 'DUPLICATE') return res.status(409).json({ success: false, error: 'Course ID already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/courses/:id
router.put('/:id', async (req, res) => {
  try {
    const course = await svc.updateCourse(req.params.id.toUpperCase(), req.body);
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.json({ success: true, data: course, message: 'Course updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await svc.deleteCourse(req.params.id.toUpperCase());
    if (!deleted) return res.status(404).json({ success: false, error: 'Course not found' });
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
