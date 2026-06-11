**FREE
// ============================================================
// ATNDSUM - Attendance Summary Report API
// GET /attendance/summary?student=X&course=Y&from=DATE&to=DATE
// Returns per-student per-course attendance percentages
// ============================================================
ctl-opt actgrp(*new) debug(*yes) option(*srcstmt);

/copy ATTNDLIB/QRPGLESRC,HTTPUTIL

dcl-s method    varchar(10);
dcl-s queryStr  varchar(500);
dcl-s stuId     varchar(10);
dcl-s crsId     varchar(10);
dcl-s fromDate  varchar(10);
dcl-s toDate    varchar(10);
dcl-s jsonArr   varchar(32767) inz('');
dcl-s row       varchar(500);
dcl-s comma     char(1)        inz('');

method   = getMethod();
queryStr = '';
exec sql set :queryStr = QSYS2.GETENV('QUERY_STRING');

stuId    = jsonGetStr(queryStr : 'student');
crsId    = jsonGetStr(queryStr : 'course');
fromDate = jsonGetStr(queryStr : 'from');
toDate   = jsonGetStr(queryStr : 'to');

if method = 'OPTIONS';
  writeHdr(200 : 'application/json');
  return;
endif;

if method <> 'GET';
  writeHdr(405 : 'application/json');
  dsply (jsonError('Method not allowed' : 405));
  return;
endif;

// Summary data
dcl-ds sumRec qualified;
  atndstu  char(10);
  stuname  varchar(61);
  stugrp   varchar(10);
  atndcrs  char(10);
  crsname  varchar(50);
  totdays  packed(7:0);
  prstdays packed(7:0);
  absdays  packed(7:0);
  latedays packed(7:0);
  excdays  packed(7:0);
  atndpct  packed(5:2);
end-ds;

jsonArr = '[';
exec sql
  declare c_sum cursor for
    select
      A.ATNDSTU,
      trim(S.STUFNM) || ' ' || trim(S.STULNM),
      S.STUGRP,
      A.ATNDCRS,
      C.CRSNM,
      count(*),
      sum(case when A.ATNDSTS = 'P' then 1 else 0 end),
      sum(case when A.ATNDSTS = 'A' then 1 else 0 end),
      sum(case when A.ATNDSTS = 'L' then 1 else 0 end),
      sum(case when A.ATNDSTS = 'E' then 1 else 0 end),
      decimal(
        sum(case when A.ATNDSTS in ('P','L') then 1 else 0 end) * 100.0
        / nullif(count(*), 0), 5, 2)
    from   ATTNDLIB.ATNDRECPF A
    join   ATTNDLIB.STUDNTPF  S on A.ATNDSTU = S.STUID
    join   ATTNDLIB.COURSEPF  C on A.ATNDCRS = C.CRSID
    where  (:stuId    = '' or A.ATNDSTU = :stuId)
      and  (:crsId    = '' or A.ATNDCRS = :crsId)
      and  (:fromDate = '' or char(A.ATNDDT, ISO) >= :fromDate)
      and  (:toDate   = '' or char(A.ATNDDT, ISO) <= :toDate)
    group  by A.ATNDSTU, S.STUFNM, S.STULNM, S.STUGRP,
              A.ATNDCRS, C.CRSNM
    order  by S.STULNM, S.STUFNM, C.CRSNM;

exec sql open c_sum;
dou sqlcode <> 0;
  exec sql fetch c_sum into
    :sumRec.atndstu, :sumRec.stuname, :sumRec.stugrp,
    :sumRec.atndcrs, :sumRec.crsname,
    :sumRec.totdays, :sumRec.prstdays, :sumRec.absdays,
    :sumRec.latedays, :sumRec.excdays, :sumRec.atndpct;
  if sqlcode = 0;
    row = comma +
          '{"studentId":"'    + %trim(sumRec.atndstu)         +
          '","studentName":"' + jsonEsc(%trim(sumRec.stuname)) +
          '","group":"'       + jsonEsc(sumRec.stugrp)         +
          '","courseId":"'    + %trim(sumRec.atndcrs)          +
          '","courseName":"'  + jsonEsc(sumRec.crsname)        +
          '","totalDays":'    + %char(sumRec.totdays)          +
          ',"presentDays":'   + %char(sumRec.prstdays)         +
          ',"absentDays":'    + %char(sumRec.absdays)          +
          ',"lateDays":'      + %char(sumRec.latedays)         +
          ',"excusedDays":'   + %char(sumRec.excdays)          +
          ',"attendancePct":' + %char(sumRec.atndpct)          + '}';
    jsonArr += row;
    comma = ',';
  endif;
enddo;
exec sql close c_sum;

jsonArr += ']';
writeHdr(200 : 'application/json');
dsply (jsonOk(jsonArr));
