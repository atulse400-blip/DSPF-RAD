'use strict';

// Mock data that mirrors ATTNDLIB DB2 tables on IBM i
// Used when USE_MOCK=true (development / demo mode)

const students = [
  { id: 'STU001', firstName: 'Alice',   lastName: 'Johnson',  group: 'Grade10A', email: 'alice@school.edu',   phone: '555-1001', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU002', firstName: 'Bob',     lastName: 'Smith',    group: 'Grade10A', email: 'bob@school.edu',     phone: '555-1002', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU003', firstName: 'Carol',   lastName: 'Williams', group: 'Grade10B', email: 'carol@school.edu',   phone: '555-1003', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU004', firstName: 'David',   lastName: 'Brown',    group: 'Grade10B', email: 'david@school.edu',   phone: '555-1004', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU005', firstName: 'Emma',    lastName: 'Davis',    group: 'Grade11A', email: 'emma@school.edu',    phone: '555-1005', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU006', firstName: 'Frank',   lastName: 'Miller',   group: 'Grade11A', email: 'frank@school.edu',   phone: '555-1006', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU007', firstName: 'Grace',   lastName: 'Wilson',   group: 'Grade11B', email: 'grace@school.edu',   phone: '555-1007', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU008', firstName: 'Henry',   lastName: 'Moore',    group: 'Grade11B', email: 'henry@school.edu',   phone: '555-1008', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU009', firstName: 'Iris',    lastName: 'Taylor',   group: 'Grade12A', email: 'iris@school.edu',    phone: '555-1009', status: 'A', createdDate: '2024-01-15' },
  { id: 'STU010', firstName: 'James',   lastName: 'Anderson', group: 'Grade12A', email: 'james@school.edu',   phone: '555-1010', status: 'A', createdDate: '2024-01-15' },
];

const courses = [
  { id: 'MATH101',  name: 'Mathematics I',      description: 'Algebra and Trigonometry',       instructor: 'Dr. Roberts',  schedule: 'MWF 08:00',  room: 'Room101', status: 'A', createdDate: '2024-01-15' },
  { id: 'PHYS101',  name: 'Physics I',           description: 'Mechanics and Thermodynamics',  instructor: 'Dr. Lee',      schedule: 'TTh 09:30',  room: 'Lab201',  status: 'A', createdDate: '2024-01-15' },
  { id: 'ENG101',   name: 'English Literature',  description: 'Classic and Modern Literature', instructor: 'Ms. Carter',   schedule: 'MWF 10:00',  room: 'Room103', status: 'A', createdDate: '2024-01-15' },
  { id: 'CHEM101',  name: 'Chemistry I',         description: 'General Chemistry',             instructor: 'Dr. Patel',    schedule: 'TTh 13:00',  room: 'Lab202',  status: 'A', createdDate: '2024-01-15' },
  { id: 'HIST101',  name: 'World History',       description: 'Ancient to Modern History',     instructor: 'Mr. Evans',    schedule: 'MWF 14:00',  room: 'Room105', status: 'A', createdDate: '2024-01-15' },
  { id: 'CS101',    name: 'Computer Science',    description: 'Introduction to Programming',   instructor: 'Ms. Singh',    schedule: 'MWF 11:00',  room: 'Lab101',  status: 'A', createdDate: '2024-01-15' },
];

const enrollments = [
  { studentId: 'STU001', courseId: 'MATH101', status: 'A' },
  { studentId: 'STU001', courseId: 'ENG101',  status: 'A' },
  { studentId: 'STU001', courseId: 'CS101',   status: 'A' },
  { studentId: 'STU002', courseId: 'MATH101', status: 'A' },
  { studentId: 'STU002', courseId: 'PHYS101', status: 'A' },
  { studentId: 'STU003', courseId: 'ENG101',  status: 'A' },
  { studentId: 'STU003', courseId: 'HIST101', status: 'A' },
  { studentId: 'STU004', courseId: 'CHEM101', status: 'A' },
  { studentId: 'STU004', courseId: 'MATH101', status: 'A' },
  { studentId: 'STU005', courseId: 'CS101',   status: 'A' },
  { studentId: 'STU005', courseId: 'MATH101', status: 'A' },
  { studentId: 'STU006', courseId: 'PHYS101', status: 'A' },
  { studentId: 'STU007', courseId: 'ENG101',  status: 'A' },
  { studentId: 'STU008', courseId: 'HIST101', status: 'A' },
  { studentId: 'STU009', courseId: 'CS101',   status: 'A' },
  { studentId: 'STU010', courseId: 'CHEM101', status: 'A' },
];

// Generate sample attendance for the last 14 days
const today = new Date();
const attendance = [];
let atndSeq = 1;

const statusPool = ['P', 'P', 'P', 'P', 'P', 'P', 'A', 'L', 'E']; // weighted toward present

for (const enrl of enrollments) {
  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const status = statusPool[Math.floor(Math.random() * statusPool.length)];
    const notes = status === 'A' ? 'Absent without notice'
                : status === 'E' ? 'Medical excuse'
                : status === 'L' ? 'Traffic delay'
                : '';

    attendance.push({
      id:          'A' + String(atndSeq++).padStart(7, '0'),
      studentId:   enrl.studentId,
      courseId:    enrl.courseId,
      date:        d.toISOString().split('T')[0],
      time:        '08:00:00',
      status,
      notes,
      createdDate: d.toISOString().split('T')[0],
    });
  }
}

module.exports = { students, courses, enrollments, attendance };
