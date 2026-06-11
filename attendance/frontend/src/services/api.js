import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Students
export const studentsApi = {
  list:     (params) => api.get('/students', { params }).then(r => r.data),
  get:      (id)     => api.get(`/students/${id}`).then(r => r.data),
  courses:  (id)     => api.get(`/students/${id}/courses`).then(r => r.data),
  summary:  (id, p)  => api.get(`/students/${id}/attendance`, { params: p }).then(r => r.data),
  create:   (data)   => api.post('/students', data).then(r => r.data),
  update:   (id, d)  => api.put(`/students/${id}`, d).then(r => r.data),
  delete:   (id)     => api.delete(`/students/${id}`).then(r => r.data),
};

// Courses
export const coursesApi = {
  list:    (params) => api.get('/courses', { params }).then(r => r.data),
  get:     (id)     => api.get(`/courses/${id}`).then(r => r.data),
  summary: (id, p)  => api.get(`/courses/${id}/summary`, { params: p }).then(r => r.data),
  create:  (data)   => api.post('/courses', data).then(r => r.data),
  update:  (id, d)  => api.put(`/courses/${id}`, d).then(r => r.data),
  delete:  (id)     => api.delete(`/courses/${id}`).then(r => r.data),
};

// Attendance
export const attendanceApi = {
  list:       (params) => api.get('/attendance', { params }).then(r => r.data),
  get:        (id)     => api.get(`/attendance/${id}`).then(r => r.data),
  summary:    (params) => api.get('/attendance/summary', { params }).then(r => r.data),
  create:     (data)   => api.post('/attendance', data).then(r => r.data),
  bulk:       (arr)    => api.post('/attendance', arr).then(r => r.data),
  update:     (id, d)  => api.put(`/attendance/${id}`, d).then(r => r.data),
  delete:     (id)     => api.delete(`/attendance/${id}`).then(r => r.data),
};
