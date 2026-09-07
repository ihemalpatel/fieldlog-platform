from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import sqlite3, hashlib, jwt, datetime, os, csv, io, json as _json, secrets, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app, methods=['GET','POST','PUT','PATCH','DELETE','OPTIONS'])

SECRET   = os.environ.get('JWT_SECRET', 'fieldlog-secret-key')
_db_dir  = os.environ.get('RAILWAY_VOLUME_MOUNT_PATH',
           os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DB_PATH  = os.path.join(_db_dir, 'fieldlog.db')

SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'noreply@fieldlog.com')
APP_URL   = os.environ.get('APP_URL', 'http://localhost:5000')

# All 4 report types
REPORT_TYPES = ['attendance', 'daily', 'driver', 'car_fuel', 'car_maintenance']

def get_db():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    c = get_db()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL,
            email           TEXT UNIQUE NOT NULL,
            password_hash   TEXT NOT NULL,
            role            TEXT DEFAULT 'engineer',
            allowed_reports TEXT DEFAULT 'attendance,daily,driver,car_fuel,car_maintenance',
            created_at      TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS reports (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id           INTEGER NOT NULL,
            report_type       TEXT DEFAULT 'daily',
            date              TEXT NOT NULL,
            day               TEXT NOT NULL,
            location          TEXT DEFAULT '',
            check_status      TEXT DEFAULT 'Pending',
            start_time        TEXT DEFAULT '',
            end_time          TEXT DEFAULT '',
            start_km          INTEGER DEFAULT 0,
            end_km            INTEGER DEFAULT 0,
            break_time        TEXT DEFAULT '01:00',
            car_plate         TEXT DEFAULT '',
            driver_name       TEXT DEFAULT '',
            short_desc        TEXT DEFAULT '',
            special_requester TEXT DEFAULT '',
            work_hours        TEXT DEFAULT '08:00',
            overtime          TEXT DEFAULT '00:00',
            shift_km          INTEGER DEFAULT 0,
            daily_tests       TEXT DEFAULT '{}',
            site_id           TEXT DEFAULT '',
            extra_data        TEXT DEFAULT '{}',
            edited_by_admin   INTEGER DEFAULT 0,
            admin_note        TEXT DEFAULT '',
            last_edited_at    TEXT,
            last_edited_by    TEXT,
            created_at        TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS punches (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            date       TEXT NOT NULL,
            punch_in   TEXT,
            punch_out  TEXT,
            note       TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            report_id  INTEGER,
            type       TEXT NOT NULL,
            message    TEXT NOT NULL,
            is_read    INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS password_resets (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            token      TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            used       INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
    ''')
    # Safe migrations
    migrations = [
        ('reports', 'report_type', "TEXT DEFAULT 'daily'"),
        ('reports', 'extra_data', "TEXT DEFAULT '{}'"),
        ('reports', 'driver_name', "TEXT DEFAULT ''"),
        ('users',   'allowed_reports', "TEXT DEFAULT 'attendance,daily,driver,car_fuel,car_maintenance'"),
        ('reports', 'photos', "TEXT DEFAULT '{}'"),
    ]
    for table, col, defval in migrations:
        try:
            c.execute(f'ALTER TABLE {table} ADD COLUMN {col} {defval}')
        except: pass
    c.commit()

    if c.execute('SELECT COUNT(*) FROM users').fetchone()[0] == 0:
        def pw(p): return hashlib.sha256(p.encode()).hexdigest()
        all_reports = 'attendance,daily,driver,car_fuel,car_maintenance'
        users = [
            ('Admin User',          'admin@fieldlog.com',    pw('admin123'),   'admin',    all_reports),
            ('Manager',             'manager@fieldlog.com',  pw('manager123'), 'manager',  all_reports),
            ('HR',                  'hr@fieldlog.com',       pw('hr123'),      'hr',       all_reports),
            ('Farshad Esmaeili',    'farshad@fieldlog.com',  pw('pass123'),    'engineer', all_reports),
            ('Hemal Patel',         'hemal@fieldlog.com',    pw('pass123'),    'engineer', all_reports),
            ('Humayun Kabir',       'humayun@fieldlog.com',  pw('pass123'),    'engineer', all_reports),
            ('Iman Sharifi',        'iman@fieldlog.com',     pw('pass123'),    'engineer', all_reports),
            ('Jeniskumar Vaghasiya','jenis@fieldlog.com',    pw('pass123'),    'engineer', all_reports),
            ('Kashif Arif',         'kashif@fieldlog.com',   pw('pass123'),    'engineer', all_reports),
            ('Mahdiyeh Cheraghi',   'mahdiyeh@fieldlog.com', pw('pass123'),   'engineer', all_reports),
            ('Maryam Alavi',        'maryam@fieldlog.com',   pw('pass123'),   'engineer', all_reports),
            ('Nayankumar Thummar',  'nayan@fieldlog.com',    pw('pass123'),   'engineer', all_reports),
            ('Tarek Hossain',       'tarek@fieldlog.com',    pw('pass123'),   'engineer', all_reports),
            ('Sample Driver',       'driver@fieldlog.com',   pw('driver123'), 'driver',   'driver,car_fuel,car_maintenance'),
        ]
        c.executemany('INSERT INTO users (name,email,password_hash,role,allowed_reports) VALUES (?,?,?,?,?)', users)
        c.commit()
    c.close()

# ── AUTH HELPERS ──────────────────────────────────────────────────────────
def make_token(uid, role, name):
    return jwt.encode({'user_id':uid,'role':role,'name':name,
        'exp':datetime.datetime.utcnow()+datetime.timedelta(days=7)}, SECRET, algorithm='HS256')

def verify_token():
    auth = request.headers.get('Authorization','')
    if not auth.startswith('Bearer '): return None
    try: return jwt.decode(auth[7:], SECRET, algorithms=['HS256'])
    except: return None

def auth_required(f):
    from functools import wraps
    @wraps(f)
    def w(*a,**k):
        u=verify_token()
        if not u: return jsonify({'error':'Unauthorized'}),401
        request.user=u; return f(*a,**k)
    return w

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def w(*a,**k):
        u=verify_token()
        if not u: return jsonify({'error':'Unauthorized'}),401
        if u['role']!='admin': return jsonify({'error':'Admin only'}),403
        request.user=u; return f(*a,**k)
    return w

def viewer_required(f):
    from functools import wraps
    @wraps(f)
    def w(*a,**k):
        u=verify_token()
        if not u: return jsonify({'error':'Unauthorized'}),401
        if u['role'] not in ('admin','manager','hr'): return jsonify({'error':'Access denied'}),403
        request.user=u; return f(*a,**k)
    return w

# ── HELPERS ───────────────────────────────────────────────────────────────
DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
def get_day(d):
    import datetime as dt
    return DAYS[dt.date.fromisoformat(d).weekday()]

def parse_break(v):
    if not v: return 0
    s=str(v).strip()
    if ':' in s: h,m=s.split(':'); return int(h)*60+int(m)
    try: return int(float(s))
    except: return 0

def calc_hours(start,end,brk):
    try:
        sh,sm=map(int,start.split(':'))
        eh,em=map(int,end.split(':'))
        total=(eh*60+em)-(sh*60+sm)
        if total<0: total+=1440
        work=total-parse_break(brk)
        ot=max(0,work-480)
        fmt=lambda m:f"{max(0,m)//60:02d}:{max(0,m)%60:02d}"
        return fmt(work),fmt(ot)
    except: return '08:00','00:00'

def send_email(to_email, subject, body_html):
    if not SMTP_HOST:
        print(f"\n[EMAIL → {to_email}]\nSubject: {subject}\n{body_html}\n")
        return True
    try:
        msg=MIMEMultipart('alternative')
        msg['Subject']=subject; msg['From']=FROM_EMAIL; msg['To']=to_email
        msg.attach(MIMEText(body_html,'html'))
        with smtplib.SMTP(SMTP_HOST,SMTP_PORT) as s:
            s.starttls(); s.login(SMTP_USER,SMTP_PASS); s.send_message(msg)
        return True
    except Exception as e:
        print(f"Email error: {e}"); return False

def make_xlsx(headers, rows, title='Report'):
    """Build an xlsx file in memory. Falls back to None if openpyxl missing."""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill
        wb = Workbook(); ws = wb.active; ws.title = title[:31]
        ws.append(headers)
        hdr_fill = PatternFill(start_color='0F1B3D', end_color='0F1B3D', fill_type='solid')
        for cell in ws[1]:
            cell.font = Font(bold=True, color='FFFFFF'); cell.fill = hdr_fill
        for r in rows: ws.append(list(r))
        for col in ws.columns:
            width = max((len(str(c.value)) for c in col if c.value is not None), default=10)
            ws.column_dimensions[col[0].column_letter].width = min(width+2, 40)
        buf = io.BytesIO(); wb.save(buf); buf.seek(0)
        return buf.read()
    except ImportError:
        return None

# ── AUTH ──────────────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def login():
    d=request.json
    ph=hashlib.sha256(d.get('password','').encode()).hexdigest()
    c=get_db()
    u=c.execute('SELECT * FROM users WHERE email=? AND password_hash=?',
                (d.get('email','').strip().lower(),ph)).fetchone()
    c.close()
    if not u: return jsonify({'error':'Invalid email or password'}),401
    return jsonify({'token':make_token(u['id'],u['role'],u['name']),
                    'user':{'id':u['id'],'name':u['name'],'role':u['role'],
                            'email':u['email'],'allowed_reports':(u['allowed_reports'] or 'attendance,daily,driver,car_fuel,car_maintenance').split(',')}})

@app.route('/api/me')
@auth_required
def me():
    c=get_db()
    u=c.execute('SELECT * FROM users WHERE id=?',(request.user['user_id'],)).fetchone()
    c.close()
    if not u: return jsonify({'error':'Not found'}),404
    return jsonify({'user':{'id':u['id'],'name':u['name'],'role':u['role'],
                            'email':u['email'],'allowed_reports':(u['allowed_reports'] or 'attendance,daily,driver,car_fuel,car_maintenance').split(',')}})

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    email=request.json.get('email','').strip().lower()
    c=get_db()
    u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
    if not u:
        c.close()
        return jsonify({'ok':True,'message':'If that email exists, a reset link has been sent.'})
    token=secrets.token_urlsafe(32)
    expires=(datetime.datetime.utcnow()+datetime.timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S')
    c.execute('INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,?)',(u['id'],token,expires))
    c.commit()
    reset_link=f"{APP_URL}/reset-password?token={token}"
    body=f"""<h2 style="color:#0f1b3d">FieldLog — Password Reset</h2>
    <p>Hi {u['name']},</p>
    <p>Click below to reset your password. This link expires in 2 hours.</p>
    <p><a href="{reset_link}" style="background:#0f1b3d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset My Password</a></p>
    <p style="color:#888;font-size:12px">Or copy: {reset_link}</p>"""
    send_email(email,'FieldLog — Password Reset',body)
    c.close()
    return jsonify({'ok':True,'message':'Reset link sent to your email.','dev_token':token})

@app.route('/api/reset-password', methods=['POST'])
def reset_password_token():
    d=request.json; token=d.get('token',''); newpw=d.get('password','')
    if not token or not newpw: return jsonify({'error':'Token and password required'}),400
    c=get_db()
    row=c.execute('SELECT * FROM password_resets WHERE token=? AND used=0',(token,)).fetchone()
    if not row: c.close(); return jsonify({'error':'Invalid or expired link'}),400
    if datetime.datetime.utcnow()>datetime.datetime.strptime(row['expires_at'],'%Y-%m-%d %H:%M:%S'):
        c.close(); return jsonify({'error':'Link expired. Request a new one.'}),400
    ph=hashlib.sha256(newpw.encode()).hexdigest()
    c.execute('UPDATE users SET password_hash=? WHERE id=?',(ph,row['user_id']))
    c.execute('UPDATE password_resets SET used=1 WHERE id=?',(row['id'],))
    c.commit(); c.close()
    return jsonify({'ok':True,'message':'Password reset! You can now sign in.'})

# ── PUNCH ─────────────────────────────────────────────────────────────────
@app.route('/api/punch')
@auth_required
def get_punch():
    date=request.args.get('date',datetime.date.today().isoformat())
    uid=request.user['user_id']
    c=get_db()
    rows=c.execute('SELECT * FROM punches WHERE user_id=? AND date=? ORDER BY id',(uid,date)).fetchall()
    c.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/punch/in', methods=['POST'])
@auth_required
def punch_in():
    d=request.json or {}
    uid=request.user['user_id']
    date=d.get('date',datetime.date.today().isoformat())
    # Custom time if provided, else now
    custom_time=d.get('custom_time','').strip()
    now=custom_time if custom_time else datetime.datetime.now().strftime('%H:%M')
    c=get_db()
    last=c.execute('SELECT * FROM punches WHERE user_id=? AND date=? AND punch_out IS NULL ORDER BY id DESC LIMIT 1',(uid,date)).fetchone()
    if last:
        c.close(); return jsonify({'error':'Please punch out first before punching in again'}),400
    c.execute('INSERT INTO punches (user_id,date,punch_in,note) VALUES (?,?,?,?)',(uid,date,now,d.get('note','')))
    c.commit(); c.close()
    return jsonify({'ok':True,'punch_in':now,'date':date})

@app.route('/api/punch/out', methods=['POST'])
@auth_required
def punch_out():
    d=request.json or {}
    uid=request.user['user_id']
    date=d.get('date',datetime.date.today().isoformat())
    custom_time=d.get('custom_time','').strip()
    now=custom_time if custom_time else datetime.datetime.now().strftime('%H:%M')
    c=get_db()
    last=c.execute('SELECT * FROM punches WHERE user_id=? AND date=? AND punch_out IS NULL ORDER BY id DESC LIMIT 1',(uid,date)).fetchone()
    if not last: c.close(); return jsonify({'error':'No active punch. Please punch in first.'}),400
    c.execute('UPDATE punches SET punch_out=? WHERE id=?',(now,last['id']))
    c.commit(); c.close()
    return jsonify({'ok':True,'punch_out':now})

@app.route('/api/punches')
@auth_required
def get_punches():
    c=get_db(); u=request.user
    month=request.args.get('month','')
    eng_id=request.args.get('engineer_id','')
    q='SELECT p.*,us.name as eng_name FROM punches p JOIN users us ON p.user_id=us.id WHERE 1=1'
    p=[]
    if u['role'] not in ('admin','manager','hr'):
        q+=' AND p.user_id=?'; p.append(u['user_id'])
    elif eng_id:
        q+=' AND p.user_id=?'; p.append(eng_id)
    if month:
        q+=" AND strftime('%Y-%m',p.date)=?"; p.append(month)
    q+=' ORDER BY p.date DESC,p.id DESC'
    rows=c.execute(q,p).fetchall(); c.close()
    return jsonify([dict(r) for r in rows])

# ── REPORTS ───────────────────────────────────────────────────────────────
@app.route('/api/reports', methods=['POST'])
@auth_required
def create_report():
    d=request.json
    uid=request.user['user_id']
    if request.user['role']=='admin' and d.get('user_id'): uid=d['user_id']
    report_type=d.get('report_type','daily')
    brk=parse_break(d.get('break_mins',d.get('break_time',60)))
    bfmt=f"{brk//60:02d}:{brk%60:02d}"
    skm=int(d.get('start_km') or 0); ekm=int(d.get('end_km') or 0)
    wh,ot=calc_hours(d.get('start_time','00:00'),d.get('end_time','00:00'),brk)
    date=d.get('date','')
    extra=_json.dumps(d.get('extra_data',{}))
    photos=_json.dumps(d.get('photos',{}))
    # Driver reports REQUIRE odometer photos
    if report_type=='driver':
        ph=d.get('photos',{})
        if not ph.get('start_photo') or not ph.get('end_photo'):
            return jsonify({'error':'Odometer photos required: please upload both Sign-In and Sign-Out odometer photos'}),400
    c=get_db()
    c.execute('''INSERT INTO reports (user_id,report_type,date,day,location,check_status,
        start_time,end_time,start_km,end_km,break_time,car_plate,driver_name,short_desc,
        special_requester,work_hours,overtime,shift_km,daily_tests,site_id,extra_data,photos)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (uid,report_type,date,get_day(date),d.get('location',''),'Pending',
         d.get('start_time',''),d.get('end_time',''),skm,ekm,bfmt,
         d.get('car_plate',''),d.get('driver_name',''),d.get('short_desc',''),
         d.get('special_requester',''),wh,ot,ekm-skm,d.get('daily_tests','{}'),
         d.get('site_id',''),extra,photos))
    c.commit(); c.close()
    return jsonify({'ok':True,'work_hours':wh,'overtime':ot})

@app.route('/api/reports/<int:rid>', methods=['PUT'])
@auth_required
def update_report(rid):
    d=request.json; c=get_db()
    row=c.execute('SELECT * FROM reports WHERE id=?',(rid,)).fetchone()
    if not row: c.close(); return jsonify({'error':'Not found'}),404
    me=request.user
    if me['role'] not in ('admin',) and row['user_id']!=me['user_id']:
        c.close(); return jsonify({'error':'Forbidden'}),403
    brk=parse_break(d.get('break_mins',d.get('break_time',60)))
    bfmt=f"{brk//60:02d}:{brk%60:02d}"
    skm=int(d.get('start_km') or 0); ekm=int(d.get('end_km') or 0)
    wh,ot=calc_hours(d.get('start_time','00:00'),d.get('end_time','00:00'),brk)
    now=datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    extra=_json.dumps(d.get('extra_data',{}))
    if me['role']=='admin':
        c.execute('''UPDATE reports SET location=?,start_time=?,end_time=?,start_km=?,end_km=?,
            break_time=?,car_plate=?,driver_name=?,short_desc=?,special_requester=?,work_hours=?,
            overtime=?,shift_km=?,daily_tests=?,site_id=?,extra_data=?,edited_by_admin=1,
            admin_note=?,last_edited_at=?,last_edited_by=? WHERE id=?''',
            (d.get('location',''),d.get('start_time',''),d.get('end_time',''),skm,ekm,bfmt,
             d.get('car_plate',''),d.get('driver_name',''),d.get('short_desc',''),
             d.get('special_requester',''),wh,ot,ekm-skm,d.get('daily_tests','{}'),
             d.get('site_id',''),extra,d.get('admin_note',''),now,me['name'],rid))
        msg=f"Admin corrected your report for {row['date']}."
        if d.get('admin_note'): msg+=f" Note: {d['admin_note']}"
        c.execute('INSERT INTO notifications (user_id,report_id,type,message) VALUES (?,?,?,?)',
                  (row['user_id'],rid,'admin_edit',msg))
    else:
        c.execute('''UPDATE reports SET location=?,start_time=?,end_time=?,start_km=?,end_km=?,
            break_time=?,car_plate=?,driver_name=?,short_desc=?,special_requester=?,work_hours=?,
            overtime=?,shift_km=?,daily_tests=?,site_id=?,extra_data=?,check_status='Pending',
            edited_by_admin=0,admin_note='',last_edited_at=?,last_edited_by=? WHERE id=?''',
            (d.get('location',''),d.get('start_time',''),d.get('end_time',''),skm,ekm,bfmt,
             d.get('car_plate',''),d.get('driver_name',''),d.get('short_desc',''),
             d.get('special_requester',''),wh,ot,ekm-skm,d.get('daily_tests','{}'),
             d.get('site_id',''),extra,now,me['name'],rid))
    c.commit(); c.close()
    return jsonify({'ok':True,'work_hours':wh,'overtime':ot})

@app.route('/api/reports')
@auth_required
def get_reports():
    c=get_db(); u=request.user
    q='SELECT r.*,us.name as eng_name FROM reports r JOIN users us ON r.user_id=us.id WHERE 1=1'
    p=[]
    if u['role'] not in ('admin','manager','hr'):
        q+=' AND r.user_id=?'; p.append(u['user_id'])
    elif request.args.get('engineer_id'):
        q+=' AND r.user_id=?'; p.append(request.args['engineer_id'])
    if request.args.get('report_type'):
        q+=' AND r.report_type=?'; p.append(request.args['report_type'])
    if request.args.get('month'):
        q+=" AND strftime('%Y-%m',r.date)=?"; p.append(request.args['month'])
    if request.args.get('search'):
        s=f"%{request.args['search']}%"
        q+=' AND (us.name LIKE ? OR r.location LIKE ? OR r.car_plate LIKE ? OR r.date LIKE ? OR r.site_id LIKE ? OR r.driver_name LIKE ? OR r.check_status LIKE ? OR r.short_desc LIKE ?)'
        p+=[s,s,s,s,s,s,s,s]
    q+=' ORDER BY r.date DESC,r.id DESC'
    rows=c.execute(q,p).fetchall(); c.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/reports/<int:rid>/check', methods=['PATCH'])
@admin_required
def set_check(rid):
    d=request.json; status=d.get('check_status','')
    if status not in ('Pending','Verified','Issue'): return jsonify({'error':'Invalid'}),400
    c=get_db()
    r=c.execute('SELECT * FROM reports WHERE id=?',(rid,)).fetchone()
    if not r: c.close(); return jsonify({'error':'Not found'}),404
    c.execute('UPDATE reports SET check_status=? WHERE id=?',(status,rid))
    if status in ('Verified','Issue'):
        msgs={'Verified':f"✅ Your report for {r['date']} has been verified.",
              'Issue':f"⚠️ Your report for {r['date']} was flagged as Issue."}
        c.execute('INSERT INTO notifications (user_id,report_id,type,message) VALUES (?,?,?,?)',
                  (r['user_id'],rid,f'status_{status.lower()}',msgs[status]))
    c.commit(); c.close()
    return jsonify({'ok':True,'check_status':status})

@app.route('/api/reports/<int:rid>', methods=['DELETE'])
@auth_required
def delete_report(rid):
    c=get_db()
    r=c.execute('SELECT user_id FROM reports WHERE id=?',(rid,)).fetchone()
    if not r: c.close(); return jsonify({'error':'Not found'}),404
    if request.user['role']!='admin' and r['user_id']!=request.user['user_id']:
        c.close(); return jsonify({'error':'Forbidden'}),403
    c.execute('DELETE FROM reports WHERE id=?',(rid,))
    c.execute('DELETE FROM notifications WHERE report_id=?',(rid,))
    c.commit(); c.close()
    return jsonify({'ok':True})

@app.route('/api/reports/export')
@viewer_required
def export_csv():
    c=get_db()
    month=request.args.get('month',''); eng_id=request.args.get('engineer_id','')
    rtype=request.args.get('report_type','')
    q='''SELECT us.name,r.report_type,r.date,r.day,r.location,r.check_status,r.start_time,
        r.end_time,r.start_km,r.end_km,r.shift_km,r.break_time,r.work_hours,r.overtime,
        r.car_plate,r.driver_name,r.site_id,r.short_desc,r.special_requester
        FROM reports r JOIN users us ON r.user_id=us.id WHERE 1=1'''
    p=[]
    if eng_id: q+=' AND r.user_id=?'; p.append(eng_id)
    if month: q+=" AND strftime('%Y-%m',r.date)=?"; p.append(month)
    if rtype: q+=' AND r.report_type=?'; p.append(rtype)
    q+=' ORDER BY r.date DESC'
    rows=c.execute(q,p).fetchall(); c.close()
    hdrs=['Engineer','Type','Date','Day','Location','Status','Start','End','Start KM',
          'End KM','Shift KM','Break','Work Hours','Overtime','Car Plate','Driver','Site ID','Description','Special Requester']
    base=f'fieldlog_reports{"_"+month if month else ""}'
    if request.args.get('format')=='xlsx':
        data=make_xlsx(hdrs,[list(r) for r in rows],'Reports')
        if data:
            return Response(data,mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            headers={'Content-Disposition':f'attachment;filename={base}.xlsx'})
    out=io.StringIO(); w=csv.writer(out)
    w.writerow(hdrs)
    for r in rows: w.writerow(list(r))
    return Response(out.getvalue(),mimetype='text/csv',
                    headers={'Content-Disposition':f'attachment;filename={base}.csv'})

# ── MONTHLY REPORT ─────────────────────────────────────────────────────────
@app.route('/api/monthly-report')
@auth_required
def monthly_report():
    u=request.user
    month=request.args.get('month',datetime.date.today().strftime('%Y-%m'))
    eng_id=request.args.get('engineer_id',str(u['user_id']))
    if u['role'] not in ('admin','manager','hr') and str(eng_id)!=str(u['user_id']):
        return jsonify({'error':'Access denied'}),403
    c=get_db()
    eng=c.execute('SELECT name,email FROM users WHERE id=?',(eng_id,)).fetchone()
    reports=c.execute("SELECT * FROM reports WHERE user_id=? AND strftime('%Y-%m',date)=? ORDER BY date",(eng_id,month)).fetchall()
    punches=c.execute("SELECT * FROM punches WHERE user_id=? AND strftime('%Y-%m',date)=? ORDER BY date",(eng_id,month)).fetchall()
    c.close()
    def mins(t):
        if not t or ':' not in t: return 0
        h,m=t.split(':'); return int(h)*60+int(m)
    tw=sum(mins(r['work_hours']) for r in reports)
    tot=sum(mins(r['overtime']) for r in reports)
    tkm=sum(r['shift_km'] or 0 for r in reports)
    fmt=lambda m:f"{m//60:02d}:{m%60:02d}"
    return jsonify({'engineer':dict(eng) if eng else {},'month':month,
        'summary':{'total_reports':len(reports),'total_work_hours':fmt(tw),
                   'total_overtime':fmt(tot),'total_km':tkm,
                   'verified':sum(1 for r in reports if r['check_status']=='Verified'),
                   'pending':sum(1 for r in reports if r['check_status']=='Pending'),
                   'issue':sum(1 for r in reports if r['check_status']=='Issue')},
        'reports':[dict(r) for r in reports],'punches':[dict(p) for p in punches]})

@app.route('/api/monthly-report/export')
@auth_required
def export_monthly():
    u=request.user
    month=request.args.get('month',datetime.date.today().strftime('%Y-%m'))
    eng_id=request.args.get('engineer_id',str(u['user_id']))
    fmt_type=request.args.get('format','csv')
    if u['role'] not in ('admin','manager','hr') and str(eng_id)!=str(u['user_id']):
        return jsonify({'error':'Access denied'}),403
    c=get_db()
    eng=c.execute('SELECT name FROM users WHERE id=?',(eng_id,)).fetchone()
    reports=c.execute("SELECT * FROM reports WHERE user_id=? AND strftime('%Y-%m',date)=? ORDER BY date",(eng_id,month)).fetchall()
    punches=c.execute("SELECT * FROM punches WHERE user_id=? AND strftime('%Y-%m',date)=? ORDER BY date",(eng_id,month)).fetchall()
    c.close()
    punch_map={}
    for p in punches:
        punch_map.setdefault(p['date'],[]).append(p)
    eng_name=eng['name'] if eng else 'Unknown'
    headers=['Date','Day','Punch In','Punch Out','Start Shift','End Shift','Break','Work Hours',
             'Overtime','Shift KM','Location','Car Plate','Driver','Site ID','Report Type','Status']
    def row_for(r):
        ps=punch_map.get(r['date'],[])
        pin=', '.join(p['punch_in'] for p in ps if p['punch_in']) or ''
        pout=', '.join(p['punch_out'] for p in ps if p['punch_out']) or ''
        return [r['date'],r['day'],pin,pout,r['start_time'],r['end_time'],
                r['break_time'],r['work_hours'],r['overtime'],r['shift_km'],
                r['location'],r['car_plate'],r['driver_name'],r['site_id'],
                r['report_type'],r['check_status']]
    if fmt_type=='xlsx':
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font, PatternFill
            wb=Workbook(); ws=wb.active; ws.title=month
            ws.append([f'Monthly Attendance Report — {eng_name} — {month}'])
            ws['A1'].font=Font(bold=True,size=13,color='0F1B3D')
            ws.append([])
            ws.append(headers)
            hf=Font(bold=True,color='FFFFFF'); fill=PatternFill('solid',fgColor='0F1B3D')
            for cell in ws[3]: cell.font=hf; cell.fill=fill
            for r in reports: ws.append(row_for(r))
            for col in ws.columns:
                ws.column_dimensions[col[0].column_letter].width=14
            buf=io.BytesIO(); wb.save(buf); buf.seek(0)
            fname=f'fieldlog_monthly_{eng_name.replace(" ","_")}_{month}.xlsx'
            return Response(buf.read(),mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            headers={'Content-Disposition':f'attachment;filename={fname}'})
        except ImportError:
            pass  # fall through to CSV
    out=io.StringIO(); w=csv.writer(out)
    w.writerow([f'Monthly Attendance Report — {eng_name} — {month}'])
    w.writerow([])
    w.writerow(headers)
    for r in reports: w.writerow(row_for(r))
    fname=f'fieldlog_monthly_{eng_name.replace(" ","_")}_{month}.csv'
    return Response(out.getvalue(),mimetype='text/csv',
                    headers={'Content-Disposition':f'attachment;filename={fname}'})

# ── NOTIFICATIONS ─────────────────────────────────────────────────────────
@app.route('/api/notifications')
@auth_required
def get_notifs():
    c=get_db()
    rows=c.execute('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
                   (request.user['user_id'],)).fetchall()
    c.close(); return jsonify([dict(r) for r in rows])

@app.route('/api/notifications/<int:nid>/read', methods=['PATCH'])
@auth_required
def read_notif(nid):
    c=get_db()
    c.execute('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?',(nid,request.user['user_id']))
    c.commit(); c.close(); return jsonify({'ok':True})

@app.route('/api/notifications/read-all', methods=['PATCH'])
@auth_required
def read_all():
    c=get_db()
    c.execute('UPDATE notifications SET is_read=1 WHERE user_id=?',(request.user['user_id'],))
    c.commit(); c.close(); return jsonify({'ok':True})

# ── USERS ─────────────────────────────────────────────────────────────────
@app.route('/api/users')
@auth_required
def get_users():
    c=get_db()
    rows=c.execute('SELECT id,name,email,role,allowed_reports,created_at FROM users ORDER BY role,name').fetchall()
    c.close(); return jsonify([dict(r) for r in rows])

@app.route('/api/users', methods=['POST'])
@admin_required
def create_user():
    d=request.json
    name=d.get('name','').strip(); email=d.get('email','').strip().lower()
    if not name or not email: return jsonify({'error':'Name and email required'}),400
    password=d.get('password','pass123')
    allowed=','.join(d.get('allowed_reports',REPORT_TYPES))
    ph=hashlib.sha256(password.encode()).hexdigest()
    c=get_db()
    try:
        c.execute('INSERT INTO users (name,email,password_hash,role,allowed_reports) VALUES (?,?,?,?,?)',
                  (name,email,ph,d.get('role','engineer'),allowed))
        c.commit()
    except sqlite3.IntegrityError: return jsonify({'error':'Email already exists'}),409
    finally: c.close()
    # Send welcome email
    body=f"""<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
    <h2 style="color:#0f1b3d">Welcome to FieldLog</h2>
    <p>Hi <strong>{name}</strong>,</p>
    <p>Your account has been created. Here are your login details:</p>
    <div style="background:#f5f7fc;padding:16px;border-radius:8px;margin:16px 0">
      <p style="margin:4px 0"><strong>URL:</strong> <a href="{APP_URL}">{APP_URL}</a></p>
      <p style="margin:4px 0"><strong>Email:</strong> {email}</p>
      <p style="margin:4px 0"><strong>Password:</strong> {password}</p>
      <p style="margin:4px 0"><strong>Role:</strong> {d.get('role','engineer').title()}</p>
    </div>
    <p style="color:#dc2626"><strong>Please change your password after your first login.</strong></p>
    <p><a href="{APP_URL}" style="background:#0f1b3d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Sign In Now</a></p>
    </div>"""
    send_email(email,'Welcome to FieldLog — Your Login Details',body)
    return jsonify({'ok':True})

@app.route('/api/users/<int:uid>', methods=['PATCH'])
@admin_required
def update_user(uid):
    d=request.json; c=get_db()
    if 'allowed_reports' in d:
        allowed=','.join(d['allowed_reports']) if isinstance(d['allowed_reports'],list) else d['allowed_reports']
        c.execute('UPDATE users SET allowed_reports=? WHERE id=?',(allowed,uid))
    if 'role' in d:
        c.execute('UPDATE users SET role=? WHERE id=?',(d['role'],uid))
    c.commit(); c.close()
    return jsonify({'ok':True})

@app.route('/api/users/<int:uid>', methods=['DELETE'])
@admin_required
def delete_user(uid):
    if uid==request.user['user_id']:
        return jsonify({'error':'You cannot delete your own account'}),403
    c=get_db()
    u=c.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone()
    if not u: c.close(); return jsonify({'error':'Not found'}),404
    c.execute('DELETE FROM users WHERE id=?',(uid,))
    c.execute('DELETE FROM reports WHERE user_id=?',(uid,))
    c.execute('DELETE FROM punches WHERE user_id=?',(uid,))
    c.execute('DELETE FROM notifications WHERE user_id=?',(uid,))
    c.commit(); c.close()
    body=f"""<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
    <h2 style="color:#0f1b3d">FieldLog — Account Deactivated</h2>
    <p>Hi <strong>{u['name']}</strong>,</p>
    <p>Your account on the FieldLog has been removed by the administrator.</p>
    <p>If you believe this is a mistake, please contact your admin.</p></div>"""
    send_email(u['email'],'FieldLog — Account Removed',body)
    return jsonify({'ok':True})

@app.route('/api/users/<int:uid>/password', methods=['PUT'])
@admin_required
def reset_user_password(uid):
    pw=request.json.get('password','')
    if not pw: return jsonify({'error':'Password required'}),400
    ph=hashlib.sha256(pw.encode()).hexdigest()
    c=get_db()
    c.execute('UPDATE users SET password_hash=? WHERE id=?',(ph,uid))
    c.commit(); c.close()
    return jsonify({'ok':True})

@app.route('/api/stats')
@viewer_required
def get_stats():
    c=get_db()
    total=c.execute('SELECT COUNT(*) FROM reports').fetchone()[0]
    engs=c.execute("SELECT COUNT(*) FROM users WHERE role='engineer'").fetchone()[0]
    active=c.execute('SELECT COUNT(DISTINCT user_id) FROM reports').fetchone()[0]
    km=c.execute('SELECT COALESCE(SUM(shift_km),0) FROM reports').fetchone()[0]
    pending=c.execute("SELECT COUNT(*) FROM reports WHERE check_status='Pending'").fetchone()[0]
    ots=c.execute('SELECT overtime FROM reports').fetchall()
    ot_m=sum(int(r[0].split(':')[0])*60+int(r[0].split(':')[1]) for r in ots if r[0] and ':' in r[0])
    eng_s=c.execute('''SELECT u.id,u.name,COUNT(r.id) as report_count,
        COALESCE(SUM(r.shift_km),0) as total_km,MAX(r.date) as last_report
        FROM users u LEFT JOIN reports r ON u.id=r.user_id
        WHERE u.role='engineer' GROUP BY u.id ORDER BY u.name''').fetchall()
    c.close()
    h,m=divmod(ot_m,60)
    return jsonify({'total_reports':total,'total_engineers':engs,'active_engineers':active,
                    'total_km':int(km),'total_overtime':f'{h:02d}:{m:02d}',
                    'pending_verification':pending,'engineers':[dict(e) for e in eng_s]})

@app.route('/api/engineer-stats')
@auth_required
def engineer_stats():
    uid=request.user['user_id']
    c=get_db()
    this_month=datetime.date.today().strftime('%Y-%m')
    reports=c.execute("SELECT * FROM reports WHERE user_id=? AND strftime('%Y-%m',date)=?",(uid,this_month)).fetchall()
    all_reports=c.execute('SELECT COUNT(*) FROM reports WHERE user_id=?',(uid,)).fetchone()[0]
    def mins(t):
        if not t or ':' not in t: return 0
        h,m=t.split(':'); return int(h)*60+int(m)
    tw=sum(mins(r['work_hours']) for r in reports)
    tot=sum(mins(r['overtime']) for r in reports)
    tkm=sum(r['shift_km'] or 0 for r in reports)
    c.close()
    fmt=lambda m:f"{m//60:02d}:{m%60:02d}"
    return jsonify({'month':this_month,'this_month_reports':len(reports),
                    'all_time_reports':all_reports,'work_hours':fmt(tw),
                    'overtime':fmt(tot),'km':tkm,
                    'verified':sum(1 for r in reports if r['check_status']=='Verified'),
                    'pending':sum(1 for r in reports if r['check_status']=='Pending')})

# ── SERVE ─────────────────────────────────────────────────────────────────
_cache={}
def _load():
    if _cache: return
    base=os.path.dirname(os.path.abspath(__file__))
    dist=os.path.normpath(os.path.join(base,'..','frontend','dist'))
    for name in ['index.html','logo.svg']:
        p=os.path.join(dist,name)
        if os.path.exists(p):
            with open(p,encoding='utf-8') as f: _cache[name]=f.read()
    assets_dir=os.path.join(dist,'assets')
    if os.path.exists(assets_dir):
        for fn in os.listdir(assets_dir):
            with open(os.path.join(assets_dir,fn),encoding='utf-8') as f: _cache['assets/'+fn]=f.read()

@app.route('/logo.svg')
def srv_logo():
    _load(); return Response(_cache.get('logo.svg','').encode(),mimetype='image/svg+xml')

@app.route('/assets/<path:fn>')
def srv_asset(fn):
    _load(); content=_cache.get('assets/'+fn,'')
    mt='application/javascript' if fn.endswith('.js') else 'text/css'
    return Response(content.encode(),mimetype=mt)

@app.route('/',defaults={'path':''})
@app.route('/<path:path>')
def srv(path):
    if path.startswith('api/'): return '',404
    _load(); html=_cache.get('index.html','<h1>Frontend not built</h1>')
    return Response(html.encode(),mimetype='text/html')

if __name__=='__main__':
    init_db()
    port=int(os.environ.get('PORT',5000))
    host=os.environ.get('HOST','127.0.0.1')
    print(f'\n  FieldLog\n  Running → http://{host}:{port}\n')
    app.run(debug=False,port=port,host=host)
