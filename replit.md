# FortiFile - Secure Document Sharing Application

## Overview
FortiFile is a secure document sharing web application built with Flask (Python) + PostgreSQL. It implements comprehensive security features including Role-Based Access Control (RBAC), Mandatory Access Control (MAC), audit logging, and incident management.

## Recent Changes
- **2025-12-17**: Initial implementation of FortiFile with all security modules

## Project Architecture

### Tech Stack
- **Backend**: Flask (Python 3.11)
- **Database**: PostgreSQL
- **Authentication**: Flask-Login + Flask-Bcrypt
- **Templates**: Jinja2

### Directory Structure
```
server/
├── __init__.py
├── app.py          # Main Flask application with all routes
├── auth.py         # Authentication helpers, RBAC/MAC decorators
├── database.py     # Database connection and schema initialization
└── templates/
    ├── base.html
    ├── index.html
    ├── login.html
    ├── register.html
    ├── dashboard.html
    ├── upload.html
    ├── share.html
    └── admin/
        ├── logs.html
        ├── users.html
        ├── incidents.html
        └── create_incident.html
uploads/            # File storage directory
```

### Security Features

#### 1. RBAC (Role-Based Access Control)
- **Tables**: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- **Default Roles**: admin, staff, student
- **Permissions**: file.upload, file.download, file.share, file.delete, admin.view_logs, admin.manage_users, admin.manage_roles, incident.manage, incident.view
- **Helpers**: `has_permission(user_id, perm)`, `@permission_required` decorator

#### 2. MAC (Mandatory Access Control)
- **Clearance Levels** (users): public < confidential < restricted
- **Classification Levels** (files): public < confidential < restricted
- **Rule**: User can only access files at or below their clearance level
- **Enforcement**: `can_access_file()` check on all file operations

#### 3. Authentication
- Secure password hashing using bcrypt
- Server-side sessions with 2-hour expiry
- Login/logout with audit logging
- Protected routes via `@login_required` decorator

#### 4. Audit Logging
- Logs: login attempts, file operations, permission denials, MAC violations, user changes, incidents
- Indexed for fast filtering by time/user/action
- Admin dashboard with filtering and suspicious activity detection

#### 5. Incident Management
- Create incidents from audit log entries
- Status tracking: open, investigating, resolved
- Severity levels: low, medium, high

### Running the Application
```bash
python -m server.app
```

### Default User Roles
After registration, users are assigned the "student" role with "public" clearance by default. Admins can change roles and clearance levels through the admin panel.

### Creating an Admin User
To create an admin user, register normally and then update via SQL:
```sql
-- Get user ID after registration
UPDATE users SET clearance = 'restricted' WHERE username = 'admin';
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.name = 'admin';
```

## User Preferences
- Clean, simple admin interface
- Modular and readable code with comments
- PostgreSQL-specific features (UUID, JSONB, indexes)
