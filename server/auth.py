from functools import wraps
from flask import session, redirect, url_for, flash, request, g
from server.database import get_db
import json

CLEARANCE_LEVELS = {'public': 0, 'confidential': 1, 'restricted': 2}

def get_current_user():
    if 'user_id' not in session:
        return None
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s AND is_active = TRUE", (session['user_id'],))
        return cur.fetchone()

def has_permission(user_id, permission_name):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE u.id = %s AND p.name = %s AND u.is_active = TRUE
            LIMIT 1
        """, (user_id, permission_name))
        return cur.fetchone() is not None

def get_user_permissions(user_id):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT p.name FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = %s
        """, (user_id,))
        return [row['name'] for row in cur.fetchall()]

def get_user_roles(user_id):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT r.name FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = %s
        """, (user_id,))
        return [row['name'] for row in cur.fetchall()]

def can_access_file(user_clearance, file_classification):
    user_level = CLEARANCE_LEVELS.get(user_clearance, 0)
    file_level = CLEARANCE_LEVELS.get(file_classification, 0)
    return user_level >= file_level

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        g.user = get_current_user()
        if not g.user:
            session.clear()
            flash('Session expired. Please log in again.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def permission_required(permission_name):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                flash('Please log in to access this page.', 'warning')
                return redirect(url_for('login'))
            if not has_permission(session['user_id'], permission_name):
                log_audit_action(
                    session['user_id'], 
                    'rbac_denied', 
                    'permission', 
                    None,
                    'denied',
                    {'required_permission': permission_name}
                )
                flash(f'Access Denied (RBAC): You do not have the "{permission_name}" permission.', 'danger')
                return redirect(url_for('dashboard'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def mac_check(file_id):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return redirect(url_for('login'))
            
            fid = kwargs.get('file_id') or file_id
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("SELECT classification FROM files WHERE id = %s", (fid,))
                file = cur.fetchone()
                
            if not file:
                flash('File not found.', 'danger')
                return redirect(url_for('dashboard'))
                
            if not can_access_file(user['clearance'], file['classification']):
                log_audit_action(
                    user['id'],
                    'mac_denied',
                    'file',
                    fid,
                    'denied',
                    {
                        'user_clearance': user['clearance'],
                        'file_classification': file['classification']
                    }
                )
                flash(f'Access Denied (MAC): Your clearance level ({user["clearance"]}) is insufficient for this file (classified as {file["classification"]}).', 'danger')
                return redirect(url_for('dashboard'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def log_audit_action(user_id, action, target_type=None, target_id=None, result='success', details=None):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO audit_logs (user_id, action, target_type, target_id, ip_address, user_agent, result, details)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            action,
            target_type,
            target_id,
            request.remote_addr if request else None,
            request.user_agent.string if request else None,
            result,
            json.dumps(details) if details else None
        ))
