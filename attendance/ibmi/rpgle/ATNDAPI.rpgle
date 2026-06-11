**FREE
// ============================================================
// ATNDAPI - Attendance REST API CGI Handler
// Handles: GET/POST/PUT/DELETE /attendance
// Status codes: P=Present A=Absent L=Late E=Excused
// ============================================================
ctl-opt actgrp(*new) debug(*yes) option(*srcstmt);

/copy ATTNDLIB/QRPGLESRC,HTTPUTIL

dcl-ds atndRec qualified;
  atndid    char(10);
  atndstu   char(10);
  atndcrs   char(10);
  atnddt    date;
  atndtm    time;
  atndsts   char(1);
  atndnts   varchar(200);
  atndcrdt  date;
end-ds;

dcl-s method   varchar(10);
dcl-s pathInfo varchar(500);
dcl-s atndId   varchar(10);
dcl-s stuId    varchar(10);
dcl-s crsId    varchar(10);
dcl-s dtStr    varchar(10);
dcl-s queryStr varchar(500);

method    = getMethod();
pathInfo  = getPathInfo();

// Path: /attendance/{id}
if %len(pathInfo) > 1;
  atndId = %trim(%subst(pathInfo : 2));
else;
  atndId = '';
endif;

// Query string for filtering: ?student=X&course=Y&date=YYYY-MM-DD
exec sql set :queryStr = QSYS2.GETENV('QUERY_STRING');
stuId = jsonGetStr(queryStr : 'student');
crsId = jsonGetStr(queryStr : 'course');
dtStr = jsonGetStr(queryStr : 'date');

if method = 'OPTIONS';
  writeHdr(200 : 'application/json');
  return;
endif;

select;
  when method = 'GET'    and atndId = '';  doGetAll();
  when method = 'GET'    and atndId <> ''; doGetOne(atndId);
  when method = 'POST';                    doCreate();
  when method = 'PUT'    and atndId <> ''; doUpdate(atndId);
  when method = 'DELETE' and atndId <> ''; doDelete(atndId);
  other;
    writeHdr(405 : 'application/json');
    dsply (jsonError('Method not allowed' : 405));
endsl;
return;

// ---- GET /attendance ----
dcl-proc doGetAll;
  dcl-pi *n;
  end-pi;
  dcl-s jsonArr varchar(32767) inz('');
  dcl-s row     varchar(700);
  dcl-s comma   char(1)        inz('');
  dcl-s stuName varchar(61);
  dcl-s crsName varchar(50);
  dcl-s stsName varchar(10);

  jsonArr = '[';
  exec sql
    declare c_atall cursor for
      select A.ATNDID, A.ATNDSTU,
             trim(S.STUFNM) || ' ' || trim(S.STULNM),
             A.ATNDCRS, C.CRSNM,
             char(A.ATNDDT, ISO), char(A.ATNDTM, ISO),
             A.ATNDSTS,
             case A.ATNDSTS
               when 'P' then 'Present'
               when 'A' then 'Absent'
               when 'L' then 'Late'
               when 'E' then 'Excused'
               else 'Unknown'
             end,
             A.ATNDNTS
      from   ATTNDLIB.ATNDRECPF A
      join   ATTNDLIB.STUDNTPF  S on A.ATNDSTU = S.STUID
      join   ATTNDLIB.COURSEPF  C on A.ATNDCRS = C.CRSID
      where  (:stuId = '' or A.ATNDSTU = :stuId)
        and  (:crsId = '' or A.ATNDCRS = :crsId)
        and  (:dtStr = '' or char(A.ATNDDT, ISO) = :dtStr)
      order  by A.ATNDDT desc, S.STULNM;

  exec sql open c_atall;
  dou sqlcode <> 0;
    exec sql fetch c_atall into
      :atndRec.atndid, :atndRec.atndstu,
      :stuName,
      :atndRec.atndcrs, :crsName,
      :atndRec.atnddt, :atndRec.atndtm,
      :atndRec.atndsts, :stsName, :atndRec.atndnts;
    if sqlcode = 0;
      row = comma +
            '{"id":"'          + %trim(atndRec.atndid)  +
            '","studentId":"'  + %trim(atndRec.atndstu) +
            '","studentName":"'+ jsonEsc(%trim(stuName)) +
            '","courseId":"'   + %trim(atndRec.atndcrs) +
            '","courseName":"' + jsonEsc(crsName)       +
            '","date":"'       + %char(atndRec.atnddt)  +
            '","time":"'       + %char(atndRec.atndtm)  +
            '","status":"'     + %trim(atndRec.atndsts) +
            '","statusName":"' + stsName                +
            '","notes":"'      + jsonEsc(atndRec.atndnts) + '"}';
      jsonArr += row;
      comma = ',';
    endif;
  enddo;
  exec sql close c_atall;

  jsonArr += ']';
  writeHdr(200 : 'application/json');
  dsply (jsonOk(jsonArr));
end-proc;

// ---- GET /attendance/{id} ----
dcl-proc doGetOne;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;
  dcl-s row     varchar(700);
  dcl-s stuName varchar(61);
  dcl-s crsName varchar(50);
  dcl-s stsName varchar(10);

  exec sql
    select A.ATNDID, A.ATNDSTU,
           trim(S.STUFNM) || ' ' || trim(S.STULNM),
           A.ATNDCRS, C.CRSNM,
           char(A.ATNDDT, ISO), char(A.ATNDTM, ISO),
           A.ATNDSTS,
           case A.ATNDSTS
             when 'P' then 'Present' when 'A' then 'Absent'
             when 'L' then 'Late'    when 'E' then 'Excused'
             else 'Unknown' end,
           A.ATNDNTS
    into   :atndRec.atndid, :atndRec.atndstu,
           :stuName,
           :atndRec.atndcrs, :crsName,
           :atndRec.atnddt, :atndRec.atndtm,
           :atndRec.atndsts, :stsName, :atndRec.atndnts
    from   ATTNDLIB.ATNDRECPF A
    join   ATTNDLIB.STUDNTPF  S on A.ATNDSTU = S.STUID
    join   ATTNDLIB.COURSEPF  C on A.ATNDCRS = C.CRSID
    where  A.ATNDID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Record not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Database error' : 500));
    return;
  endif;

  row = '{"id":"'          + %trim(atndRec.atndid)  +
        '","studentId":"'  + %trim(atndRec.atndstu) +
        '","studentName":"'+ jsonEsc(%trim(stuName)) +
        '","courseId":"'   + %trim(atndRec.atndcrs) +
        '","courseName":"' + jsonEsc(crsName)       +
        '","date":"'       + %char(atndRec.atnddt)  +
        '","time":"'       + %char(atndRec.atndtm)  +
        '","status":"'     + %trim(atndRec.atndsts) +
        '","statusName":"' + stsName                +
        '","notes":"'      + jsonEsc(atndRec.atndnts) + '"}';

  writeHdr(200 : 'application/json');
  dsply (jsonOk(row));
end-proc;

// ---- POST /attendance (single or bulk) ----
dcl-proc doCreate;
  dcl-pi *n;
  end-pi;
  dcl-s bodyIn varchar(32767);
  dcl-s newId  varchar(10);
  bodyIn = readBody();

  atndRec.atndstu = %trim(jsonGetStr(bodyIn : 'studentId'));
  atndRec.atndcrs = %trim(jsonGetStr(bodyIn : 'courseId'));
  atndRec.atndsts = jsonGetStr(bodyIn : 'status');
  atndRec.atndnts = jsonGetStr(bodyIn : 'notes');

  if atndRec.atndstu = '' or atndRec.atndcrs = '';
    writeHdr(400 : 'application/json');
    dsply (jsonError('studentId and courseId are required' : 400));
    return;
  endif;
  if atndRec.atndsts = '';
    atndRec.atndsts = 'P';
  endif;

  // Generate ID: 'A' + 7 digit seq
  exec sql
    set :newId = 'A' || lpad(
      char(coalesce(max(integer(substr(ATNDID,2))),0) + 1),
      7, '0')
    from ATTNDLIB.ATNDRECPF;

  exec sql
    insert into ATTNDLIB.ATNDRECPF
    (ATNDID, ATNDSTU, ATNDCRS, ATNDDT, ATNDTM, ATNDSTS, ATNDNTS, ATNDCRDT)
    values (:newId, :atndRec.atndstu, :atndRec.atndcrs,
            CURRENT_DATE, CURRENT_TIME,
            :atndRec.atndsts, :atndRec.atndnts, CURRENT_DATE);

  if sqlcode = -803;
    writeHdr(409 : 'application/json');
    dsply (jsonError('Attendance already recorded for this date' : 409));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Insert failed' : 500));
    return;
  endif;

  writeHdr(201 : 'application/json');
  dsply ('{"success":true,"id":"' + newId + '","message":"Attendance recorded"}');
end-proc;

// ---- PUT /attendance/{id} ----
dcl-proc doUpdate;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;
  dcl-s bodyIn varchar(32767);
  bodyIn = readBody();

  atndRec.atndsts = jsonGetStr(bodyIn : 'status');
  atndRec.atndnts = jsonGetStr(bodyIn : 'notes');

  exec sql
    update ATTNDLIB.ATNDRECPF set
      ATNDSTS = :atndRec.atndsts,
      ATNDNTS = :atndRec.atndnts
    where ATNDID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Record not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Update failed' : 500));
    return;
  endif;

  writeHdr(200 : 'application/json');
  dsply ('{"success":true,"message":"Attendance updated"}');
end-proc;

// ---- DELETE /attendance/{id} ----
dcl-proc doDelete;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;

  exec sql delete from ATTNDLIB.ATNDRECPF where ATNDID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Record not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Delete failed' : 500));
    return;
  endif;

  writeHdr(200 : 'application/json');
  dsply ('{"success":true,"message":"Record deleted"}');
end-proc;
