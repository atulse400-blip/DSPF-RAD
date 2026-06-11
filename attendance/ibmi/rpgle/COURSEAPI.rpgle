**FREE
// ============================================================
// COURSEAPI - Course REST API CGI Handler
// Handles: GET/POST/PUT/DELETE /courses
// Deploy to IBM i HTTP Server as CGI program
// ============================================================
ctl-opt actgrp(*new) debug(*yes) option(*srcstmt);

/copy ATTNDLIB/QRPGLESRC,HTTPUTIL

dcl-ds crsRec qualified;
  crsid    char(10);
  crsnm    varchar(50);
  crsdsc   varchar(100);
  crsinst  varchar(50);
  crssched varchar(30);
  crsroom  varchar(10);
  crssts   char(1);
  crscrdt  date;
end-ds;

dcl-s method   varchar(10);
dcl-s pathInfo varchar(500);
dcl-s crsId    varchar(10);

method   = getMethod();
pathInfo = getPathInfo();

if %len(pathInfo) > 1;
  crsId = %trim(%subst(pathInfo : 2));
else;
  crsId = '';
endif;

if method = 'OPTIONS';
  writeHdr(200 : 'application/json');
  return;
endif;

select;
  when method = 'GET'    and crsId = '';   doGetAll();
  when method = 'GET'    and crsId <> '';  doGetOne(crsId);
  when method = 'POST';                    doCreate();
  when method = 'PUT'    and crsId <> '';  doUpdate(crsId);
  when method = 'DELETE' and crsId <> '';  doDelete(crsId);
  other;
    writeHdr(405 : 'application/json');
    dsply (jsonError('Method not allowed' : 405));
endsl;
return;

// ---- GET /courses ----
dcl-proc doGetAll;
  dcl-pi *n;
  end-pi;
  dcl-s jsonArr varchar(32767) inz('');
  dcl-s row     varchar(600);
  dcl-s comma   char(1)        inz('');

  jsonArr = '[';
  exec sql
    declare c_crsall cursor for
      select CRSID, CRSNM, CRSDSC, CRSINST, CRSSCHED, CRSROOM, CRSSTS,
             char(CRSCRDT, ISO)
      from   ATTNDLIB.COURSEPF
      order  by CRSNM;

  exec sql open c_crsall;
  dou sqlcode <> 0;
    exec sql fetch c_crsall into
      :crsRec.crsid, :crsRec.crsnm, :crsRec.crsdsc,
      :crsRec.crsinst, :crsRec.crssched, :crsRec.crsroom,
      :crsRec.crssts, :crsRec.crscrdt;
    if sqlcode = 0;
      row = comma +
            '{"id":"'          + %trim(crsRec.crsid)    +
            '","name":"'       + jsonEsc(crsRec.crsnm)  +
            '","description":"'+ jsonEsc(crsRec.crsdsc) +
            '","instructor":"' + jsonEsc(crsRec.crsinst)+
            '","schedule":"'   + jsonEsc(crsRec.crssched)+
            '","room":"'       + jsonEsc(crsRec.crsroom)+
            '","status":"'     + %trim(crsRec.crssts)   +
            '","createdDate":"'+ %char(crsRec.crscrdt)  + '"}';
      jsonArr += row;
      comma = ',';
    endif;
  enddo;
  exec sql close c_crsall;

  jsonArr += ']';
  writeHdr(200 : 'application/json');
  dsply (jsonOk(jsonArr));
end-proc;

// ---- GET /courses/{id} ----
dcl-proc doGetOne;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;
  dcl-s row varchar(600);

  exec sql
    select CRSID, CRSNM, CRSDSC, CRSINST, CRSSCHED, CRSROOM, CRSSTS,
           char(CRSCRDT, ISO)
    into   :crsRec.crsid, :crsRec.crsnm, :crsRec.crsdsc,
           :crsRec.crsinst, :crsRec.crssched, :crsRec.crsroom,
           :crsRec.crssts, :crsRec.crscrdt
    from   ATTNDLIB.COURSEPF
    where  CRSID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Course not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Database error' : 500));
    return;
  endif;

  row = '{"id":"'          + %trim(crsRec.crsid)    +
        '","name":"'       + jsonEsc(crsRec.crsnm)  +
        '","description":"'+ jsonEsc(crsRec.crsdsc) +
        '","instructor":"' + jsonEsc(crsRec.crsinst)+
        '","schedule":"'   + jsonEsc(crsRec.crssched)+
        '","room":"'       + jsonEsc(crsRec.crsroom)+
        '","status":"'     + %trim(crsRec.crssts)   +
        '","createdDate":"'+ %char(crsRec.crscrdt)  + '"}';

  writeHdr(200 : 'application/json');
  dsply (jsonOk(row));
end-proc;

// ---- POST /courses ----
dcl-proc doCreate;
  dcl-pi *n;
  end-pi;
  dcl-s bodyIn varchar(32767);
  bodyIn = readBody();

  crsRec.crsid    = %trim(jsonGetStr(bodyIn : 'id'));
  crsRec.crsnm    = jsonGetStr(bodyIn : 'name');
  crsRec.crsdsc   = jsonGetStr(bodyIn : 'description');
  crsRec.crsinst  = jsonGetStr(bodyIn : 'instructor');
  crsRec.crssched = jsonGetStr(bodyIn : 'schedule');
  crsRec.crsroom  = jsonGetStr(bodyIn : 'room');

  if crsRec.crsid = '' or crsRec.crsnm = '';
    writeHdr(400 : 'application/json');
    dsply (jsonError('id and name are required' : 400));
    return;
  endif;

  exec sql
    insert into ATTNDLIB.COURSEPF
    (CRSID, CRSNM, CRSDSC, CRSINST, CRSSCHED, CRSROOM, CRSSTS, CRSCRDT)
    values (:crsRec.crsid, :crsRec.crsnm, :crsRec.crsdsc,
            :crsRec.crsinst, :crsRec.crssched, :crsRec.crsroom,
            'A', CURRENT_DATE);

  if sqlcode = -803;
    writeHdr(409 : 'application/json');
    dsply (jsonError('Course ID already exists' : 409));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Insert failed' : 500));
    return;
  endif;

  writeHdr(201 : 'application/json');
  dsply ('{"success":true,"message":"Course created"}');
end-proc;

// ---- PUT /courses/{id} ----
dcl-proc doUpdate;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;
  dcl-s bodyIn varchar(32767);
  bodyIn = readBody();

  crsRec.crsnm    = jsonGetStr(bodyIn : 'name');
  crsRec.crsdsc   = jsonGetStr(bodyIn : 'description');
  crsRec.crsinst  = jsonGetStr(bodyIn : 'instructor');
  crsRec.crssched = jsonGetStr(bodyIn : 'schedule');
  crsRec.crsroom  = jsonGetStr(bodyIn : 'room');
  crsRec.crssts   = jsonGetStr(bodyIn : 'status');

  exec sql
    update ATTNDLIB.COURSEPF set
      CRSNM    = :crsRec.crsnm,
      CRSDSC   = :crsRec.crsdsc,
      CRSINST  = :crsRec.crsinst,
      CRSSCHED = :crsRec.crssched,
      CRSROOM  = :crsRec.crsroom,
      CRSSTS   = :crsRec.crssts
    where CRSID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Course not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Update failed' : 500));
    return;
  endif;

  writeHdr(200 : 'application/json');
  dsply ('{"success":true,"message":"Course updated"}');
end-proc;

// ---- DELETE /courses/{id} ----
dcl-proc doDelete;
  dcl-pi *n;
    p_id varchar(10) const;
  end-pi;

  exec sql delete from ATTNDLIB.COURSEPF where CRSID = :p_id;

  if sqlcode = 100;
    writeHdr(404 : 'application/json');
    dsply (jsonError('Course not found' : 404));
    return;
  elseif sqlcode <> 0;
    writeHdr(500 : 'application/json');
    dsply (jsonError('Delete failed' : 500));
    return;
  endif;

  writeHdr(200 : 'application/json');
  dsply ('{"success":true,"message":"Course deleted"}');
end-proc;
