'use strict';
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const studentsRouter   = require('./routes/students');
const coursesRouter    = require('./routes/courses');
const attendanceRouter = require('./routes/attendance');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode:   process.env.USE_MOCK !== 'false' ? 'mock' : 'ibmi',
    ibmiHost: process.env.IBMI_HOST || '(not set)',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/students',   studentsRouter);
app.use('/api/courses',    coursesRouter);
app.use('/api/attendance', attendanceRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  const mode = process.env.USE_MOCK !== 'false' ? 'MOCK (in-memory)' : `IBM i @ ${process.env.IBMI_HOST}`;
  console.log(`Attendance API running on port ${PORT}  [mode: ${mode}]`);
});
