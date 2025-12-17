import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_database():
    with get_db() as conn:
        cur = conn.cursor()
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
                permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
                PRIMARY KEY (role_id, permission_id)
            );
        """)
        
        cur.execute("""
            DO $$ BEGIN
                CREATE TYPE clearance_level AS ENUM ('public', 'confidential', 'restricted');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                clearance clearance_level DEFAULT 'public',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_roles (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, role_id)
            );
        """)
        
        cur.execute("""
            DO $$ BEGIN
                CREATE TYPE classification_level AS ENUM ('public', 'confidential', 'restricted');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                file_size BIGINT,
                mime_type VARCHAR(100),
                classification classification_level DEFAULT 'public',
                owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS file_shares (
                id SERIAL PRIMARY KEY,
                file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
                shared_with_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                shared_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(file_id, shared_with_id)
            );
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50),
                target_id INTEGER,
                ip_address VARCHAR(45),
                user_agent TEXT,
                result VARCHAR(20) DEFAULT 'success',
                details JSONB
            );
            
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);
        """)
        
        cur.execute("""
            DO $$ BEGIN
                CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'resolved');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
            
            DO $$ BEGIN
                CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                status incident_status DEFAULT 'open',
                severity incident_severity DEFAULT 'low',
                title VARCHAR(255) NOT NULL,
                description TEXT,
                related_audit_log_id INTEGER REFERENCES audit_logs(id) ON DELETE SET NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        seed_data(cur)
        
def seed_data(cur):
    cur.execute("SELECT COUNT(*) as count FROM roles")
    if cur.fetchone()['count'] == 0:
        cur.execute("""
            INSERT INTO roles (name, description) VALUES
            ('admin', 'System administrator with full access'),
            ('staff', 'Staff member with elevated privileges'),
            ('student', 'Regular user with basic access')
            ON CONFLICT (name) DO NOTHING;
        """)
    
    cur.execute("SELECT COUNT(*) as count FROM permissions")
    if cur.fetchone()['count'] == 0:
        cur.execute("""
            INSERT INTO permissions (name, description) VALUES
            ('file.upload', 'Upload files'),
            ('file.download', 'Download files'),
            ('file.share', 'Share files with others'),
            ('file.delete', 'Delete own files'),
            ('admin.view_logs', 'View audit logs'),
            ('admin.manage_roles', 'Manage user roles'),
            ('admin.manage_users', 'Manage user accounts'),
            ('incident.manage', 'Create and manage incidents'),
            ('incident.view', 'View incidents')
            ON CONFLICT (name) DO NOTHING;
        """)
    
    cur.execute("SELECT COUNT(*) as count FROM role_permissions")
    if cur.fetchone()['count'] == 0:
        cur.execute("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p
            WHERE r.name = 'admin';
        """)
        
        cur.execute("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p
            WHERE r.name = 'staff' AND p.name IN ('file.upload', 'file.download', 'file.share', 'file.delete', 'incident.view')
            ON CONFLICT DO NOTHING;
        """)
        
        cur.execute("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id FROM roles r, permissions p
            WHERE r.name = 'student' AND p.name IN ('file.upload', 'file.download')
            ON CONFLICT DO NOTHING;
        """)
