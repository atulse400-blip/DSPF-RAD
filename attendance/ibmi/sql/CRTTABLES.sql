-- ============================================================
-- CRTTABLES.sql  -  Create Attendance System Tables on IBM i
-- Library: ATTNDLIB
-- Run via: RUNSQLSTM SRCSTMF('/path/CRTTABLES.sql')
-- ============================================================

-- Create library if not exists
CREATE SCHEMA ATTNDLIB;

-- ============================================================
-- STUDNTPF - Students Master Table
-- ============================================================
CREATE TABLE ATTNDLIB.STUDNTPF (
    STUID     CHAR(10)     NOT NULL,
    STUFNM    VARCHAR(30)  NOT NULL,
    STULNM    VARCHAR(30)  NOT NULL,
    STUGRP    VARCHAR(10)  NOT NULL DEFAULT '',
    STUEML    VARCHAR(50)  NOT NULL DEFAULT '',
    STUPHONE  VARCHAR(15)  NOT NULL DEFAULT '',
    STUSTS    CHAR(1)      NOT NULL DEFAULT 'A',
    STUCRDT   DATE         NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT STUDNTPF_PK  PRIMARY KEY (STUID),
    CONSTRAINT STUDNTPF_STS CHECK (STUSTS IN ('A','I'))
);

LABEL ON TABLE ATTNDLIB.STUDNTPF IS 'Student Master File';
LABEL ON COLUMN ATTNDLIB.STUDNTPF (
    STUID     IS 'Student ID',
    STUFNM    IS 'First Name',
    STULNM    IS 'Last Name',
    STUGRP    IS 'Grade/Group',
    STUEML    IS 'Email',
    STUPHONE  IS 'Phone',
    STUSTS    IS 'Status',
    STUCRDT   IS 'Created Date'
);

-- ============================================================
-- COURSEPF - Courses Master Table
-- ============================================================
CREATE TABLE ATTNDLIB.COURSEPF (
    CRSID     CHAR(10)     NOT NULL,
    CRSNM     VARCHAR(50)  NOT NULL,
    CRSDSC    VARCHAR(100) NOT NULL DEFAULT '',
    CRSINST   VARCHAR(50)  NOT NULL DEFAULT '',
    CRSSCHED  VARCHAR(30)  NOT NULL DEFAULT '',
    CRSROOM   VARCHAR(10)  NOT NULL DEFAULT '',
    CRSSTS    CHAR(1)      NOT NULL DEFAULT 'A',
    CRSCRDT   DATE         NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT COURSEPF_PK  PRIMARY KEY (CRSID),
    CONSTRAINT COURSEPF_STS CHECK (CRSSTS IN ('A','I'))
);

LABEL ON TABLE ATTNDLIB.COURSEPF IS 'Course Master File';

-- ============================================================
-- ATNDRECPF - Attendance Records Table
-- ============================================================
CREATE TABLE ATTNDLIB.ATNDRECPF (
    ATNDID    CHAR(10)     NOT NULL,
    ATNDSTU   CHAR(10)     NOT NULL,
    ATNDCRS   CHAR(10)     NOT NULL,
    ATNDDT    DATE         NOT NULL,
    ATNDTM    TIME         NOT NULL DEFAULT CURRENT_TIME,
    ATNDSTS   CHAR(1)      NOT NULL DEFAULT 'P',
    ATNDNTS   VARCHAR(200) NOT NULL DEFAULT '',
    ATNDCRDT  DATE         NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT ATNDRECPF_PK  PRIMARY KEY (ATNDID),
    CONSTRAINT ATNDRECPF_STU FOREIGN KEY (ATNDSTU)
              REFERENCES ATTNDLIB.STUDNTPF (STUID)
              ON DELETE CASCADE,
    CONSTRAINT ATNDRECPF_CRS FOREIGN KEY (ATNDCRS)
              REFERENCES ATTNDLIB.COURSEPF (CRSID)
              ON DELETE CASCADE,
    CONSTRAINT ATNDRECPF_STS CHECK (ATNDSTS IN ('P','A','L','E')),
    CONSTRAINT ATNDRECPF_UK  UNIQUE (ATNDSTU, ATNDCRS, ATNDDT)
);

LABEL ON TABLE ATTNDLIB.ATNDRECPF IS 'Attendance Records File';

-- ============================================================
-- STUCRSEPF - Student-Course Enrollment Table
-- ============================================================
CREATE TABLE ATTNDLIB.STUCRSEPF (
    ENRLSTU   CHAR(10)     NOT NULL,
    ENRLCRS   CHAR(10)     NOT NULL,
    ENRLDT    DATE         NOT NULL DEFAULT CURRENT_DATE,
    ENRLSTS   CHAR(1)      NOT NULL DEFAULT 'A',
    CONSTRAINT STUCRSEPF_PK  PRIMARY KEY (ENRLSTU, ENRLCRS),
    CONSTRAINT STUCRSEPF_STU FOREIGN KEY (ENRLSTU)
              REFERENCES ATTNDLIB.STUDNTPF (STUID)
              ON DELETE CASCADE,
    CONSTRAINT STUCRSEPF_CRS FOREIGN KEY (ENRLCRS)
              REFERENCES ATTNDLIB.COURSEPF (CRSID)
              ON DELETE CASCADE,
    CONSTRAINT STUCRSEPF_STS CHECK (ENRLSTS IN ('A','D'))
);

LABEL ON TABLE ATTNDLIB.STUCRSEPF IS 'Student Course Enrollment';

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX ATTNDLIB.ATNDSTUIDX ON ATTNDLIB.ATNDRECPF (ATNDSTU, ATNDDT);
CREATE INDEX ATTNDLIB.ATNDCRSIDX ON ATTNDLIB.ATNDRECPF (ATNDCRS, ATNDDT);
CREATE INDEX ATTNDLIB.STUGRPIDX  ON ATTNDLIB.STUDNTPF  (STUGRP, STULNM);

-- ============================================================
-- View: ATNDDETV - Attendance with student and course names
-- ============================================================
CREATE VIEW ATTNDLIB.ATNDDETV AS
    SELECT
        A.ATNDID,
        A.ATNDSTU,
        S.STUFNM || ' ' || S.STULNM AS STUNAME,
        S.STUGRP,
        A.ATNDCRS,
        C.CRSNM,
        C.CRSINST,
        A.ATNDDT,
        A.ATNDTM,
        A.ATNDSTS,
        CASE A.ATNDSTS
            WHEN 'P' THEN 'Present'
            WHEN 'A' THEN 'Absent'
            WHEN 'L' THEN 'Late'
            WHEN 'E' THEN 'Excused'
            ELSE 'Unknown'
        END AS STSNAME,
        A.ATNDNTS
    FROM ATTNDLIB.ATNDRECPF A
    JOIN ATTNDLIB.STUDNTPF  S ON A.ATNDSTU = S.STUID
    JOIN ATTNDLIB.COURSEPF  C ON A.ATNDCRS = C.CRSID;

-- ============================================================
-- View: ATNDSUMLV - Attendance Summary per Student per Course
-- ============================================================
CREATE VIEW ATTNDLIB.ATNDSUMLV AS
    SELECT
        A.ATNDSTU,
        S.STUFNM || ' ' || S.STULNM AS STUNAME,
        S.STUGRP,
        A.ATNDCRS,
        C.CRSNM,
        COUNT(*)                                    AS TOTDAYS,
        SUM(CASE WHEN A.ATNDSTS = 'P' THEN 1 ELSE 0 END) AS PRSTDAYS,
        SUM(CASE WHEN A.ATNDSTS = 'A' THEN 1 ELSE 0 END) AS ABSDAYS,
        SUM(CASE WHEN A.ATNDSTS = 'L' THEN 1 ELSE 0 END) AS LATEDAYS,
        SUM(CASE WHEN A.ATNDSTS = 'E' THEN 1 ELSE 0 END) AS EXCDAYS,
        DECIMAL(
            SUM(CASE WHEN A.ATNDSTS IN ('P','L') THEN 1 ELSE 0 END) * 100.0
            / NULLIF(COUNT(*), 0), 5, 2)            AS ATNDPCT
    FROM ATTNDLIB.ATNDRECPF A
    JOIN ATTNDLIB.STUDNTPF  S ON A.ATNDSTU = S.STUID
    JOIN ATTNDLIB.COURSEPF  C ON A.ATNDCRS = C.CRSID
    GROUP BY A.ATNDSTU, S.STUFNM, S.STULNM, S.STUGRP,
             A.ATNDCRS, C.CRSNM;
