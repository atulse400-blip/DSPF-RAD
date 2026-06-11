**FREE
// ============================================================
// HTTPUTIL - HTTP Utility Service Program
// Shared helpers for JSON CGI handlers
// Compile: CRTRPGMOD / CRTSRVPGM HTTPUTIL
// ============================================================
ctl-opt nomain debug(*yes) option(*srcstmt);

// ---- Write HTTP response header ----
dcl-proc writeHdr export;
  dcl-pi *n;
    p_status  int(10) const;
    p_mime    varchar(50) const;
  end-pi;

  dcl-s statusLine varchar(60);

  select;
    when p_status = 200;  statusLine = 'Status: 200 OK';
    when p_status = 201;  statusLine = 'Status: 201 Created';
    when p_status = 400;  statusLine = 'Status: 400 Bad Request';
    when p_status = 404;  statusLine = 'Status: 404 Not Found';
    when p_status = 409;  statusLine = 'Status: 409 Conflict';
    when p_status = 500;  statusLine = 'Status: 500 Internal Server Error';
    other;                statusLine = 'Status: ' + %char(p_status);
  endsl;

  dsply ('HTTP/1.0 ' + statusLine);
  dsply ('Content-Type: ' + p_mime);
  dsply ('Access-Control-Allow-Origin: *');
  dsply ('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
  dsply ('Access-Control-Allow-Headers: Content-Type,Authorization');
  dsply (' ');
end-proc;

// ---- Build JSON error response ----
dcl-proc jsonError export;
  dcl-pi *n varchar(500);
    p_msg  varchar(200) const;
    p_code int(10) const;
  end-pi;
  return '{"success":false,"error":"' + p_msg + '","code":' +
          %char(p_code) + '}';
end-proc;

// ---- Build JSON success response ----
dcl-proc jsonOk export;
  dcl-pi *n varchar(32767);
    p_data varchar(32000) const;
  end-pi;
  return '{"success":true,"data":' + p_data + '}';
end-proc;

// ---- Read HTTP request body (CGI STDIN) ----
dcl-proc readBody export;
  dcl-pi *n varchar(32767);
  end-pi;
  dcl-s body   varchar(32767);
  dcl-s envLen varchar(10);
  dcl-s bodyLen int(10);

  // Read CONTENT_LENGTH env var
  exec sql set :envLen = QSYS2.GETENV('CONTENT_LENGTH');
  if %len(%trim(envLen)) > 0;
    bodyLen = %int(%trim(envLen));
  else;
    bodyLen = 0;
  endif;

  if bodyLen > 0 and bodyLen <= 32767;
    // Read from stdin in CGI context
    // In production use QtmhRdStin API
    exec sql set :body = QSYS2.HTTP_GET_REQUEST_BODY();
  endif;
  return body;
end-proc;

// ---- Get PATH_INFO environment variable ----
dcl-proc getPathInfo export;
  dcl-pi *n varchar(500);
  end-pi;
  dcl-s pathInfo varchar(500);
  exec sql set :pathInfo = QSYS2.GETENV('PATH_INFO');
  return %trim(pathInfo);
end-proc;

// ---- Get HTTP_METHOD environment variable ----
dcl-proc getMethod export;
  dcl-pi *n varchar(10);
  end-pi;
  dcl-s method varchar(10);
  exec sql set :method = QSYS2.GETENV('REQUEST_METHOD');
  return %trim(%upper(method));
end-proc;

// ---- Extract JSON field value (simple string) ----
dcl-proc jsonGetStr export;
  dcl-pi *n varchar(500);
    p_json  varchar(32767) const;
    p_field varchar(50) const;
  end-pi;
  dcl-s startPos int(10);
  dcl-s endPos   int(10);
  dcl-s search   varchar(60);
  dcl-s value    varchar(500);

  search = '"' + p_field + '":"';
  startPos = %scan(search : p_json);
  if startPos = 0;
    return '';
  endif;
  startPos += %len(search);
  endPos = %scan('"' : p_json : startPos);
  if endPos = 0;
    return '';
  endif;
  return %subst(p_json : startPos : endPos - startPos);
end-proc;

// ---- Escape string for JSON ----
dcl-proc jsonEsc export;
  dcl-pi *n varchar(500);
    p_str varchar(500) const;
  end-pi;
  dcl-s result varchar(500);
  result = p_str;
  // Basic escape: backslash, quote, newline
  result = %scanrpl('\' : '\\' : result);
  result = %scanrpl('"' : '\"' : result);
  result = %scanrpl(x'25' : '\n' : result);
  return result;
end-proc;
