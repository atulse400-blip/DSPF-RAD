**FREE
// ============================================================
// STUDNTAPI - Student REST API CGI Handler
// Handles: GET/POST/PUT/DELETE /students
// Deploy to IBM i HTTP Server as CGI program
// Compile: CRTSQLRPGI OBJ(ATTNDLIB/STUDNTAPI) SRCSTMF('/path/STUDNTAPI.rpgle')
// ============================================================
ctl-opt actgrp(*new) debug(*yes) option(*srcstmt);

/copy ATTNDLIB/QRPGLESRC,HTTPUTIL

dcl-f STUDNTPF usage(*input *output *update *delete)
                keyed
                usropn;

// Student data structure matching STUDNTPF
dcl-ds studRec qualified;
  stuid    char(10);
  stufnm   varchar(30);
  stulnm   varchar(30);
  stugrp   varchar(10);
  stueml   varchar(50);
  stuphone varchar(15);
  stusts   char(1);
  stucrdt  date;
end-ds;

dcl-s method    varchar(10);
dcl-s pathInfo  varchar(500);
dcl-s stuId     varchar(10);
dcl-s body      varchar(32767);
dcl-s response  varchar(32767);
dcl-s jsonBuf   varchar(32767);
dcl-s comma     varchar(1) inz('');
dcl-s sqlRc     int(10);

// Main entry
method   = getMethod();
pathInfo = getPathInfo();

// Extract student ID from path  /students/{id}
if %len(pathInfo) > 1;
  stuId = %trim(%subst(pathInfo : 2));
else;
  stuId = '';
endif;

// Handle OPTIONS preflight
if method = 'OPTIONS';
  writeHdr(200 : 'application/json');
  return;
endif;

select;
  when method = 'GET'    and stuId = '';   doGetAll();
  when method = 'GET'    and stuId <> '';  doGetOne(stuId);
  when method = 'POST';                    doCreate();
  when method = 'PUT'    and stuId <> '';  doUpdate(stuId);
  when method = 'DELETE' and stuId <> '';  doDelete(stuId);
  other;
    writeHdr(405 : 'application/json');
    dsply (jsonError('Method not allowed' : 405));
endsl;
return;

// ---- GET /students ----
dcl-proc doGetAll;
  dcl-pi *n;
  end-pi;

  dcl-s row     varchar(500);
  dcl-s jsonArr varchar(32767) inz('');
  dcl-s comma   char(1)        inz('');

  jsonArr = '[';
  exec sql
    declare c_stuall cursor for
      select STUID, STUFNM, STULNM, STUGRP, STUEML, STUPHONE, STUSTS,
             char(STUCRDT, ISO)
      from   ATTNDLIB.STUDNTPF
      order  by STULNM, STUFNM;

  exec sql open c_stuall;
  dou sqlcode <> 0;
    exec sql fetch c_stuall into
      :studRec.stuid, :studRec.stufnm, :studRec.stulnm,
      :studRec.stugrp, :studRec.stueml, :studRec.stuphone,
      :studRec.stusts, :studRec.stucrdt;
    if sqlcode = 0;
      row = comma + '{"id":"'     + %trim(studRec.stuid)    +
            '","firstName":"'     + jsonEsc(studRec.stufnm) +
            '","lastName":"'      + jsonEsc(studRec.stulnm) +
            '","group":"'         + jsonEsc(studRec.stugrp) +
            '","email":"'         + jsonEsc(studRec.stueml) +
            '","phone":"'         + jsonEsc(studRec.stuphone) +
            '","status":"'        + %trim(studRec.stusts)   +
            '","createdDate":"'   + %char(studRec.stucrdt)  + '"}';
      jsonArr += row;
      comma = ',';
    endif;
  enddo;
  exec sql close c_stuall;

  jsonArr += ']';
  writeHdr(200 : 'application/json');
  dsply (jsonOk(jsonArr));
end-proc;

// ---- GET /students/{id} ----
dcl-proc doGetOne;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;
  dcl-s row varchar(500);

  exec sql
    select STUID, STUFNM, STULNM, STUGRP, STUEML, STUPHONE, STUSTS,
           char(STUCRDT, ISO)
    into   :studRec.stuid, :studRec.stufnm, :studRec.stulnm,
           :studRec.stugrp, :studRec.stueml, :studRec.stuphone,
           :studRec.stusts, :studRec.stucrdt
    from   ATTNDLIB.STUDNTPF
    where  STUID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Student not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Database error' : 500));
    return;
  endif;

  row = '{"id":"'         + %trim(studRec.stuid)    +
        '","firstName":"' + jsonEsc(studRec.stufnm) +
        '","lastName":"'  + jsonEsc(studRec.stulnm) +
        '","group":"'     + jsonEsc(studRec.stugrp) +
        '","email":"'     + jsonEsc(studRec.stueml) +
        '","phone":"'     + jsonEsc(studRec.stuphone) +
        '","status":"'    + %trim(studRec.stusts)   +
        '","createdDate":"' + %char(studRec.stucrdt) + '"}';

  writeHdr(200 : 'application/json');
  dsply (jsonOk(row));
end-proc;

// ---- POST /students ----
dcl-proc doCreate;
  dcl-pi *n;
  end-pi;
  dcl-s bodyIn varchar(32767);
  bodyIn = readBody();

  studRec.stuid    = %trim(jsonGetStr(bodyIn : 'id'));
  studRec.stufnm   = jsonGetStr(bodyIn : 'firstName');
  studRec.stulnm   = jsonGetStr(bodyIn : 'lastName');
  studRec.stugrp   = jsonGetStr(bodyIn : 'group');
  studRec.stueml   = jsonGetStr(bodyIn : 'email');
  studRec.stuphone = jsonGetStr(bodyIn : 'phone');
  studRec.stusts   = 'A';

  if studRec.stuid = '' or studRec.stufnm = '' or studRec.stulnm = '';
    writeHdr(400 : 'application/json');
    dsply (jsonError('id firstName lastName are required' : 400));
    return;
  endif;

  exec sql
    insert into ATTNDLIB.STUDNTPF
    (STUID, STUFNM, STULNM, STUGRP, STUEML, STUPHONE, STUSTS, STUCRDT)
    values (:studRec.stuid, :studRec.stufnm, :studRec.stulnm,
            :studRec.stugrp, :studRec.stueml, :studRec.stuphone,
            'A', CURRENT_DATE);

  if sqlcode = -803;
    writeHdr(409 : 'application/json');
    dsply (jsonError('Student ID already exists' : 409));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Insert failed' : 500));
    return;
  endif;

  writeHdr(201 : 'application/json');
  dsply ('{"success":true,"message":"Student created"}');
end-proc;

// ---- PUT /students/{id} ----
dcl-proc doUpdate;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;
  dcl-s bodyIn varchar(32767);
  bodyIn = readBody();

  studRec.stufnm   = jsonGetStr(bodyIn : 'firstName');
  studRec.stulnm   = jsonGetStr(bodyIn : 'lastName');
  studRec.stugrp   = jsonGetStr(bodyIn : 'group');
  studRec.stueml   = jsonGetStr(bodyIn : 'email');
  studRec.stuphone = jsonGetStr(bodyIn : 'phone');
  studRec.stusts   = jsonGetStr(bodyIn : 'status');

  exec sql
    update ATTNDLIB.STUDNTPF set
      STUFNM   = :studRec.stufnm,
      STULNM   = :studRec.stulnm,
      STUGRP   = :studRec.stugrp,
      STUEML   = :studRec.stueml,
      STUPHONE = :studRec.stuphone,
      STUSTS   = :studRec.stusts
    where STUID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Student not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Update failed' : 500));
    return;
  endif;

  writeHdr(200 : 'application/json');
  dsply ('{"success":true,"message":"Student updated"}');
end-proc;

// ---- DELETE /students/{id} ----
dcl-proc doDelete;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;

  exec sql delete from ATTNDLIB.STUDNTPF where STUID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Student not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Delete failed' : 500));
    return;
  endif;

  writeHdr(200 : 'application/json');
  dsply ('{"success":true,"message":"Student deleted"}');
end-proc;
