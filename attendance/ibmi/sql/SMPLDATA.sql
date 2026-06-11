-- ============================================================
-- SMPLDATA.sql  -  Sample Data for Attendance System
-- Run after CRTTABLES.sql
-- ============================================================

-- Students
INSERT INTO ATTNDLIB.STUDNTPF VALUES
 ('STU001', 'Alice',   'Johnson',  'Grade10A', 'alice@school.edu',   '555-1001', 'A', CURRENT_DATE),
 ('STU002', 'Bob',     'Smith',    'Grade10A', 'bob@school.edu',     '555-1002', 'A', CURRENT_DATE),
 ('STU003', 'Carol',   'Williams', 'Grade10B', 'carol@school.edu',   '555-1003', 'A', CURRENT_DATE),
 ('STU004', 'David',   'Brown',    'Grade10B', 'david@school.edu',   '555-1004', 'A', CURRENT_DATE),
 ('STU005', 'Emma',    'Davis',    'Grade11A', 'emma@school.edu',    '555-1005', 'A', CURRENT_DATE),
 ('STU006', 'Frank',   'Miller',   'Grade11A', 'frank@school.edu',   '555-1006', 'A', CURRENT_DATE),
 ('STU007', 'Grace',   'Wilson',   'Grade11B', 'grace@school.edu',   '555-1007', 'A', CURRENT_DATE),
 ('STU008', 'Henry',   'Moore',    'Grade11B', 'henry@school.edu',   '555-1008', 'A', CURRENT_DATE),
 ('STU009', 'Iris',    'Taylor',   'Grade12A', 'iris@school.edu',    '555-1009', 'A', CURRENT_DATE),
 ('STU010', 'James',   'Anderson', 'Grade12A', 'james@school.edu',   '555-1010', 'A', CURRENT_DATE);

-- Courses
INSERT INTO ATTNDLIB.COURSEPF VALUES
 ('MATH101', 'Mathematics I',      'Algebra and Trigonometry',  'Dr. Roberts',  'MWF 08:00', 'Room101', 'A', CURRENT_DATE),
 ('PHYS101', 'Physics I',          'Mechanics and Thermodynamics', 'Dr. Lee',   'TTh 09:30', 'Lab201',  'A', CURRENT_DATE),
 ('ENG101',  'English Literature', 'Classic and Modern Lit',    'Ms. Carter',   'MWF 10:00', 'Room103', 'A', CURRENT_DATE),
 ('CHEM101', 'Chemistry I',        'General Chemistry',         'Dr. Patel',    'TTh 13:00', 'Lab202',  'A', CURRENT_DATE),
 ('HIST101', 'World History',      'Ancient to Modern History', 'Mr. Evans',    'MWF 14:00', 'Room105', 'A', CURRENT_DATE),
 ('CS101',   'Computer Science',   'Intro to Programming',      'Ms. Singh',    'MWF 11:00', 'Lab101',  'A', CURRENT_DATE);

-- Enrollments
INSERT INTO ATTNDLIB.STUCRSEPF VALUES
 ('STU001','MATH101', CURRENT_DATE,'A'),
 ('STU001','ENG101',  CURRENT_DATE,'A'),
 ('STU001','CS101',   CURRENT_DATE,'A'),
 ('STU002','MATH101', CURRENT_DATE,'A'),
 ('STU002','PHYS101', CURRENT_DATE,'A'),
 ('STU003','ENG101',  CURRENT_DATE,'A'),
 ('STU003','HIST101', CURRENT_DATE,'A'),
 ('STU004','CHEM101', CURRENT_DATE,'A'),
 ('STU004','MATH101', CURRENT_DATE,'A'),
 ('STU005','CS101',   CURRENT_DATE,'A'),
 ('STU005','MATH101', CURRENT_DATE,'A'),
 ('STU006','PHYS101', CURRENT_DATE,'A'),
 ('STU007','ENG101',  CURRENT_DATE,'A'),
 ('STU008','HIST101', CURRENT_DATE,'A'),
 ('STU009','CS101',   CURRENT_DATE,'A'),
 ('STU010','CHEM101', CURRENT_DATE,'A');

-- Sample attendance records (last 5 days)
INSERT INTO ATTNDLIB.ATNDRECPF VALUES
 ('A0000001','STU001','MATH101', CURRENT_DATE - 4 DAYS, '08:00:00','P','',CURRENT_DATE),
 ('A0000002','STU001','MATH101', CURRENT_DATE - 3 DAYS, '08:00:00','P','',CURRENT_DATE),
 ('A0000003','STU001','MATH101', CURRENT_DATE - 2 DAYS, '08:05:00','L','Arrived 5 min late',CURRENT_DATE),
 ('A0000004','STU001','MATH101', CURRENT_DATE - 1 DAYS, '08:00:00','P','',CURRENT_DATE),
 ('A0000005','STU002','MATH101', CURRENT_DATE - 4 DAYS, '08:00:00','P','',CURRENT_DATE),
 ('A0000006','STU002','MATH101', CURRENT_DATE - 3 DAYS, '08:00:00','A','Sick',CURRENT_DATE),
 ('A0000007','STU002','MATH101', CURRENT_DATE - 2 DAYS, '08:00:00','E','Doctor note',CURRENT_DATE),
 ('A0000008','STU002','MATH101', CURRENT_DATE - 1 DAYS, '08:00:00','P','',CURRENT_DATE),
 ('A0000009','STU003','ENG101',  CURRENT_DATE - 4 DAYS, '10:00:00','P','',CURRENT_DATE),
 ('A0000010','STU003','ENG101',  CURRENT_DATE - 3 DAYS, '10:00:00','P','',CURRENT_DATE);
