# IBM i Deployment Guide

## Prerequisites

- IBM i V7R4 or higher
- ILE RPG compiler (5770-WDS)
- HTTP Server (Apache) for IBM i
- Authority: QSECOFR or equivalent

## Step 1 — Create Library

```
CRTLIB LIB(ATTNDLIB) TYPE(*PROD) TEXT('Student Attendance System')
```

## Step 2 — Create Source Physical Files

```
CRTSRCPF FILE(ATTNDLIB/QDDSSRC)   RCDLEN(112) TEXT('DDS Source')
CRTSRCPF FILE(ATTNDLIB/QRPGLESRC) RCDLEN(112) TEXT('RPGLE Source')
```

## Step 3 — Upload DDS and RPGLE source

Use IBM i Access Client Solutions or FTP to upload the `.dds` and `.rpgle` files
into the corresponding source physical file members.

OR use QSYS.LIB IFS path:

```bash
# From a PASE shell or SSH session
cp dds/STUDNTPF.dds   /QSYS.LIB/ATTNDLIB.LIB/QDDSSRC.FILE/STUDNTPF.MBR
cp dds/COURSEPF.dds   /QSYS.LIB/ATTNDLIB.LIB/QDDSSRC.FILE/COURSEPF.MBR
cp dds/ATNDRECPF.dds  /QSYS.LIB/ATTNDLIB.LIB/QDDSSRC.FILE/ATNDRECPF.MBR
cp dds/STUCRSEPF.dds  /QSYS.LIB/ATTNDLIB.LIB/QDDSSRC.FILE/STUCRSEPF.MBR
```

## Step 4 — Create Tables (SQL approach — recommended)

```
RUNSQLSTM SRCSTMF('/path/to/CRTTABLES.sql') COMMIT(*NONE) NAMING(*SYS)
```

OR compile DDS files:

```
CRTPF  FILE(ATTNDLIB/STUDNTPF)  SRCFILE(ATTNDLIB/QDDSSRC) SRCMBR(STUDNTPF)
CRTPF  FILE(ATTNDLIB/COURSEPF)  SRCFILE(ATTNDLIB/QDDSSRC) SRCMBR(COURSEPF)
CRTPF  FILE(ATTNDLIB/ATNDRECPF) SRCFILE(ATTNDLIB/QDDSSRC) SRCMBR(ATNDRECPF)
CRTPF  FILE(ATTNDLIB/STUCRSEPF) SRCFILE(ATTNDLIB/QDDSSRC) SRCMBR(STUCRSEPF)
```

## Step 5 — Load Sample Data (optional)

```
RUNSQLSTM SRCSTMF('/path/to/SMPLDATA.sql') COMMIT(*NONE) NAMING(*SYS)
```

## Step 6 — Compile RPGLE Programs

```
CRTSQLRPGI OBJ(ATTNDLIB/HTTPUTIL) SRCFILE(ATTNDLIB/QRPGLESRC) SRCMBR(HTTPUTIL) +
           OBJTYPE(*SRVPGM) COMMIT(*NONE)

CRTSQLRPGI OBJ(ATTNDLIB/STUDNTAPI) SRCFILE(ATTNDLIB/QRPGLESRC) SRCMBR(STUDNTAPI) +
           COMMIT(*NONE)

CRTSQLRPGI OBJ(ATTNDLIB/COURSEAPI) SRCFILE(ATTNDLIB/QRPGLESRC) SRCMBR(COURSEAPI) +
           COMMIT(*NONE)

CRTSQLRPGI OBJ(ATTNDLIB/ATNDAPI)   SRCFILE(ATTNDLIB/QRPGLESRC) SRCMBR(ATNDAPI) +
           COMMIT(*NONE)

CRTSQLRPGI OBJ(ATTNDLIB/ATNDSUM)   SRCFILE(ATTNDLIB/QRPGLESRC) SRCMBR(ATNDSUM) +
           COMMIT(*NONE)
```

## Step 7 — Configure IBM i HTTP Server (Apache)

Edit `/www/ATTNDSVR/conf/httpd.conf`:

```apache
Listen 10080
DocumentRoot /www/ATTNDSVR/htdocs

<Directory /www/ATTNDSVR/htdocs>
  Require all granted
</Directory>

ScriptAlias /cgi-bin/ /www/ATTNDSVR/cgi-bin/
<Directory /www/ATTNDSVR/cgi-bin>
  Options +ExecCGI
  Require all granted
</Directory>

# Route REST calls to CGI programs
AliasMatch ^/students(.*)$ /cgi-bin/STUDNTAPI.pgm$1
AliasMatch ^/courses(.*)$  /cgi-bin/COURSEAPI.pgm$1
AliasMatch ^/attendance/summary$ /cgi-bin/ATNDSUM.pgm
AliasMatch ^/attendance(.*)$     /cgi-bin/ATNDAPI.pgm$1

Header always set Access-Control-Allow-Origin "*"
```

Start the HTTP server:

```
STRTCPSVR SERVER(*HTTP) HTTPSVR(ATTNDSVR)
```

## Step 8 — Connect Node.js backend to IBM i

Update `.env` in the `backend/` directory:

```env
USE_MOCK=false
IBMI_HOST=your-ibmi-host.example.com
IBMI_USER=ATTNDUSER
IBMI_PASSWORD=yourpassword
IBMI_LIBRARY=ATTNDLIB
```

Install IBM i ODBC driver on the Node.js server, then:

```bash
npm install odbc
```

## Step 9 — IWS (Integrated Web Services) alternative

Instead of the CGI approach, you can use IBM i IWS to expose the RPGLE
service programs as REST services:

1. Open IBM i Navigator > Network > TCP/IP Servers > HTTP
2. Right-click > Start "IWS"
3. Open IWS browser: `http://your-ibmi:2001/HTTPAdmin`
4. Create a new REST service, point to ATTNDLIB/HTTPUTIL service program
5. Map each exported procedure to an HTTP endpoint

## Naming convention

All IBM i objects comply with the 10-character naming limit:

| Object     | Type   | Purpose                      |
|------------|--------|------------------------------|
| STUDNTPF   | *FILE  | Students physical file       |
| COURSEPF   | *FILE  | Courses physical file        |
| ATNDRECPF  | *FILE  | Attendance records file      |
| STUCRSEPF  | *FILE  | Student-course enrollment    |
| STUDNTAPI  | *PGM   | Student REST API handler     |
| COURSEAPI  | *PGM   | Course REST API handler      |
| ATNDAPI    | *PGM   | Attendance REST API handler  |
| ATNDSUM    | *PGM   | Attendance summary handler   |
| HTTPUTIL   | *SRVPGM| HTTP/JSON utility functions  |
| ATTNDLIB   | *LIB   | Attendance system library    |
