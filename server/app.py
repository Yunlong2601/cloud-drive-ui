import os
import uuid
from datetime import timedelta
from flask import Flask, render_template, request, redirect, url_for, flash, session, g, send_from_directory
from flask_bcrypt import Bcrypt
from werkzeug.utils import secure_filename
import json

from server.database import get_db, init_database
from server.auth import (
    login_required, permission_required, mac_check,
    get_current_user, has_permission, get_user_permissions, get_user_roles,
    can_access_file, log_audit_action, CLEARANCE_LEVELS
)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(32))
app.permanent_session_lifetime = timedelta(hours=2)

app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

bcrypt = Bcrypt(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

@app.before_request
def before_request():
    g.user = get_current_user() if 'user_id' in session else None

@app.context_processor
def inject_user():
    return dict(
        current_user=g.user,
        has_permission=lambda p: has_permission(g.user['id'], p) if g.user else False
    )

@app.route('/')
def index():
    if g.user:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        
        if not username or not email or not password:
            flash('All fields are required.', 'danger')
            return render_template('register.html')
        
        if len(password) < 8:
            flash('Password must be at least 8 characters.', 'danger')
            return render_template('register.html')
        
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        
        try:
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO users (username, email, password_hash, clearance)
                    VALUES (%s, %s, %s, 'public')
                    RETURNING id
                """, (username, email, password_hash))
                user_id = cur.fetchone()['id']
                
                cur.execute("""
                    INSERT INTO user_roles (user_id, role_id)
                    SELECT %s, id FROM roles WHERE name = 'student'
                """, (user_id,))
                
                log_audit_action(user_id, 'user_registered', 'user', user_id, 'success')
                
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            if 'unique' in str(e).lower():
                flash('Username or email already exists.', 'danger')
            else:
                flash('Registration failed. Please try again.', 'danger')
            return render_template('register.html')
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE username = %s", (username,))
            user = cur.fetchone()
        
        if user and bcrypt.check_password_hash(user['password_hash'], password):
            if not user['is_active']:
                log_audit_action(user['id'], 'login_attempt', 'user', user['id'], 'denied', {'reason': 'account_disabled'})
                flash('Your account has been disabled.', 'danger')
                return render_template('login.html')
            
            session.permanent = True
            session['user_id'] = user['id']
            log_audit_action(user['id'], 'login', 'user', user['id'], 'success')
            flash('Welcome back!', 'success')
            return redirect(url_for('dashboard'))
        else:
            user_id = user['id'] if user else None
            log_audit_action(user_id, 'login_attempt', 'user', user_id, 'failed', {'username': username})
            flash('Invalid username or password.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    if 'user_id' in session:
        log_audit_action(session['user_id'], 'logout', 'user', session['user_id'], 'success')
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    with get_db() as conn:
        cur = conn.cursor()
        user_clearance = g.user['clearance']
        clearance_level = CLEARANCE_LEVELS.get(user_clearance, 0)
        
        allowed_classifications = [k for k, v in CLEARANCE_LEVELS.items() if v <= clearance_level]
        
        cur.execute("""
            SELECT f.*, u.username as owner_name
            FROM files f
            LEFT JOIN users u ON f.owner_id = u.id
            WHERE (f.owner_id = %s OR f.id IN (
                SELECT file_id FROM file_shares WHERE shared_with_id = %s
            ))
            AND f.classification = ANY(%s)
            ORDER BY f.created_at DESC
        """, (g.user['id'], g.user['id'], allowed_classifications))
        files = cur.fetchall()
    
    return render_template('dashboard.html', files=files, user_roles=get_user_roles(g.user['id']))

@app.route('/upload', methods=['GET', 'POST'])
@login_required
@permission_required('file.upload')
def upload():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file selected.', 'danger')
            return redirect(request.url)
        
        file = request.files['file']
        if file.filename == '':
            flash('No file selected.', 'danger')
            return redirect(request.url)
        
        classification = request.form.get('classification', 'public')
        if classification not in CLEARANCE_LEVELS:
            classification = 'public'
        
        user_clearance_level = CLEARANCE_LEVELS.get(g.user['clearance'], 0)
        file_classification_level = CLEARANCE_LEVELS.get(classification, 0)
        if file_classification_level > user_clearance_level:
            log_audit_action(g.user['id'], 'mac_denied', 'file', None, 'denied', {
                'action': 'upload',
                'user_clearance': g.user['clearance'],
                'attempted_classification': classification
            })
            flash(f'Access Denied (MAC): Your clearance level ({g.user["clearance"]}) cannot upload files classified as {classification}.', 'danger')
            return redirect(url_for('upload'))
        
        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{original_filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        file_size = os.path.getsize(filepath)
        
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO files (filename, original_filename, file_size, mime_type, classification, owner_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (unique_filename, original_filename, file_size, file.content_type, classification, g.user['id']))
            file_id = cur.fetchone()['id']
        
        log_audit_action(g.user['id'], 'file_upload', 'file', file_id, 'success', {'filename': original_filename, 'classification': classification})
        flash('File uploaded successfully!', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('upload.html')

@app.route('/download/<int:file_id>')
@login_required
@permission_required('file.download')
def download(file_id):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT f.* FROM files f
            WHERE f.id = %s AND (
                f.owner_id = %s OR 
                f.id IN (SELECT file_id FROM file_shares WHERE shared_with_id = %s)
            )
        """, (file_id, g.user['id'], g.user['id']))
        file = cur.fetchone()
    
    if not file:
        flash('File not found or access denied.', 'danger')
        return redirect(url_for('dashboard'))
    
    if not can_access_file(g.user['clearance'], file['classification']):
        log_audit_action(g.user['id'], 'mac_denied', 'file', file_id, 'denied', {
            'user_clearance': g.user['clearance'],
            'file_classification': file['classification']
        })
        flash(f'Access Denied (MAC): Your clearance level ({g.user["clearance"]}) is insufficient for this file (classified as {file["classification"]}).', 'danger')
        return redirect(url_for('dashboard'))
    
    log_audit_action(g.user['id'], 'file_download', 'file', file_id, 'success')
    return send_from_directory(app.config['UPLOAD_FOLDER'], file['filename'], as_attachment=True, download_name=file['original_filename'])

@app.route('/share/<int:file_id>', methods=['GET', 'POST'])
@login_required
@permission_required('file.share')
def share(file_id):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM files WHERE id = %s AND owner_id = %s", (file_id, g.user['id']))
        file = cur.fetchone()
    
    if not file:
        flash('File not found or you do not own this file.', 'danger')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, clearance FROM users WHERE username = %s AND id != %s", (username, g.user['id']))
            target_user = cur.fetchone()
        
        if not target_user:
            flash('User not found.', 'danger')
            return render_template('share.html', file=file)
        
        if not can_access_file(target_user['clearance'], file['classification']):
            flash(f'Cannot share: User clearance ({target_user["clearance"]}) is insufficient for this file classification ({file["classification"]}).', 'danger')
            return render_template('share.html', file=file)
        
        try:
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO file_shares (file_id, shared_with_id, shared_by_id)
                    VALUES (%s, %s, %s)
                """, (file_id, target_user['id'], g.user['id']))
            
            log_audit_action(g.user['id'], 'file_share', 'file', file_id, 'success', {'shared_with': username})
            flash(f'File shared with {username}!', 'success')
            return redirect(url_for('dashboard'))
        except Exception as e:
            if 'unique' in str(e).lower():
                flash('File already shared with this user.', 'warning')
            else:
                flash('Failed to share file.', 'danger')
    
    return render_template('share.html', file=file)

@app.route('/delete/<int:file_id>', methods=['POST'])
@login_required
@permission_required('file.delete')
def delete_file(file_id):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM files WHERE id = %s AND owner_id = %s", (file_id, g.user['id']))
        file = cur.fetchone()
    
    if not file:
        flash('File not found or you do not own this file.', 'danger')
        return redirect(url_for('dashboard'))
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file['filename'])
    if os.path.exists(filepath):
        os.remove(filepath)
    
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM files WHERE id = %s", (file_id,))
    
    log_audit_action(g.user['id'], 'file_delete', 'file', file_id, 'success', {'filename': file['original_filename']})
    flash('File deleted.', 'success')
    return redirect(url_for('dashboard'))

@app.route('/admin/logs')
@login_required
@permission_required('admin.view_logs')
def admin_logs():
    page = request.args.get('page', 1, type=int)
    per_page = 50
    offset = (page - 1) * per_page
    
    action_filter = request.args.get('action', '')
    result_filter = request.args.get('result', '')
    user_filter = request.args.get('user_id', '', type=str)
    
    with get_db() as conn:
        cur = conn.cursor()
        
        query = """
            SELECT al.*, u.username 
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        """
        params = []
        
        if action_filter:
            query += " AND al.action = %s"
            params.append(action_filter)
        if result_filter:
            query += " AND al.result = %s"
            params.append(result_filter)
        if user_filter:
            query += " AND al.user_id = %s"
            params.append(int(user_filter))
        
        query += " ORDER BY al.created_at DESC LIMIT %s OFFSET %s"
        params.extend([per_page, offset])
        
        cur.execute(query, params)
        logs = cur.fetchall()
        
        cur.execute("SELECT DISTINCT action FROM audit_logs ORDER BY action")
        actions = [r['action'] for r in cur.fetchall()]
        
        cur.execute("""
            SELECT al.action, COUNT(*) as count
            FROM audit_logs al
            WHERE al.result IN ('failed', 'denied')
            AND al.created_at > NOW() - INTERVAL '24 hours'
            GROUP BY al.action
            ORDER BY count DESC
            LIMIT 10
        """)
        suspicious = cur.fetchall()
    
    return render_template('admin/logs.html', logs=logs, actions=actions, suspicious=suspicious, page=page)

@app.route('/admin/users')
@login_required
@permission_required('admin.manage_users')
def admin_users():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.*, array_agg(r.name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        """)
        users = cur.fetchall()
        
        cur.execute("SELECT * FROM roles ORDER BY name")
        roles = cur.fetchall()
    
    return render_template('admin/users.html', users=users, roles=roles, clearance_levels=list(CLEARANCE_LEVELS.keys()))

@app.route('/admin/users/<int:user_id>/update', methods=['POST'])
@login_required
@permission_required('admin.manage_users')
def admin_update_user(user_id):
    clearance = request.form.get('clearance')
    role_ids = request.form.getlist('roles')
    is_active = request.form.get('is_active') == 'on'
    
    with get_db() as conn:
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE users SET clearance = %s, is_active = %s, updated_at = NOW()
            WHERE id = %s
        """, (clearance, is_active, user_id))
        
        cur.execute("DELETE FROM user_roles WHERE user_id = %s", (user_id,))
        for role_id in role_ids:
            cur.execute("INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)", (user_id, int(role_id)))
    
    log_audit_action(g.user['id'], 'user_update', 'user', user_id, 'success', {
        'clearance': clearance, 'roles': role_ids, 'is_active': is_active
    })
    flash('User updated.', 'success')
    return redirect(url_for('admin_users'))

@app.route('/admin/incidents')
@login_required
@permission_required('incident.manage')
def admin_incidents():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT i.*, u.username as created_by_name
            FROM incidents i
            LEFT JOIN users u ON i.created_by = u.id
            ORDER BY i.created_at DESC
        """)
        incidents = cur.fetchall()
    
    return render_template('admin/incidents.html', incidents=incidents)

@app.route('/admin/incidents/create', methods=['GET', 'POST'])
@login_required
@permission_required('incident.manage')
def create_incident():
    audit_log_id = request.args.get('audit_log_id', type=int)
    audit_log = None
    
    if audit_log_id:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM audit_logs WHERE id = %s", (audit_log_id,))
            audit_log = cur.fetchone()
    
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        severity = request.form.get('severity', 'low')
        related_log_id = request.form.get('related_audit_log_id', type=int)
        
        if not title:
            flash('Title is required.', 'danger')
            return render_template('admin/create_incident.html', audit_log=audit_log)
        
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO incidents (title, description, severity, created_by, related_audit_log_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (title, description, severity, g.user['id'], related_log_id))
            incident_id = cur.fetchone()['id']
        
        log_audit_action(g.user['id'], 'incident_create', 'incident', incident_id, 'success')
        flash('Incident created.', 'success')
        return redirect(url_for('admin_incidents'))
    
    return render_template('admin/create_incident.html', audit_log=audit_log)

@app.route('/admin/incidents/<int:incident_id>/update', methods=['POST'])
@login_required
@permission_required('incident.manage')
def update_incident(incident_id):
    status = request.form.get('status')
    
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE incidents SET status = %s, updated_at = NOW()
            WHERE id = %s
        """, (status, incident_id))
    
    log_audit_action(g.user['id'], 'incident_update', 'incident', incident_id, 'success', {'new_status': status})
    flash('Incident updated.', 'success')
    return redirect(url_for('admin_incidents'))

with app.app_context():
    init_database()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
