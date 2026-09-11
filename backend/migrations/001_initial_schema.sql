-- ═══════════════════════════════════════════════════════════════
-- EPIP Phase 1 — Full PostgreSQL Schema
-- Run: psql -U postgres -d epip_db -f migrations/001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('admin','hr','manager','employee')),
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ── Departments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  head_id    INT,                          -- FK to employees added later
  color      VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Employees ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                  SERIAL PRIMARY KEY,
  user_id             INT REFERENCES users(id) ON DELETE SET NULL,
  employee_id         VARCHAR(20) NOT NULL UNIQUE,
  first_name          VARCHAR(80) NOT NULL,
  last_name           VARCHAR(80) NOT NULL,
  email               VARCHAR(180) NOT NULL UNIQUE,
  phone               VARCHAR(30),
  department_id       INT REFERENCES departments(id) ON DELETE SET NULL,
  designation         VARCHAR(100),
  manager_id          INT REFERENCES employees(id) ON DELETE SET NULL,
  join_date           DATE,
  work_mode           VARCHAR(20) NOT NULL DEFAULT 'office'
                        CHECK (work_mode IN ('office','remote','hybrid')),
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','on_leave')),
  salary              NUMERIC(12,2),
  location            VARCHAR(100),
  avatar_url          TEXT,
  profile_completion  INT NOT NULL DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id       ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id    ON employees(manager_id);

-- Add FK from departments.head_id → employees
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ── Employee Skills ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_skills (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill       VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Employee Education ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_education (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  degree      VARCHAR(150),
  institution VARCHAR(200),
  year        INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Employee Experience ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_experience (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company     VARCHAR(150),
  role        VARCHAR(100),
  duration    VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Employee Certifications ───────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_certifications (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name        VARCHAR(200),
  year        INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Attendance ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id           SERIAL PRIMARY KEY,
  employee_id  INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  check_in     TIMESTAMPTZ,
  check_out    TIMESTAMPTZ,
  break_time   INT NOT NULL DEFAULT 0,           -- minutes
  hours_worked NUMERIC(5,2),
  overtime     NUMERIC(5,2) NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'present'
                 CHECK (status IN ('present','absent','leave','holiday')),
  is_late      BOOLEAN NOT NULL DEFAULT false,
  work_mode    VARCHAR(20) CHECK (work_mode IN ('office','remote','hybrid')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date          ON attendance(date);

-- ── Leave Requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type        VARCHAR(60) NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        INT NOT NULL DEFAULT 1,
  reason      TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
  approved_by INT REFERENCES employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  assigned_to       INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by       INT REFERENCES employees(id) ON DELETE SET NULL,
  priority          VARCHAR(20) NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low','medium','high','urgent')),
  status            VARCHAR(20) NOT NULL DEFAULT 'todo'
                      CHECK (status IN ('todo','in_progress','review','done')),
  due_date          DATE,
  completion_percent INT NOT NULL DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
  tags              TEXT[],
  comments_count    INT NOT NULL DEFAULT 0,
  attachments_count INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);

-- ── Task Comments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id          SERIAL PRIMARY KEY,
  task_id     INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Goals ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id                 SERIAL PRIMARY KEY,
  employee_id        INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id      INT REFERENCES departments(id) ON DELETE SET NULL,
  title              VARCHAR(200) NOT NULL,
  description        TEXT,
  type               VARCHAR(20) NOT NULL DEFAULT 'quarterly'
                       CHECK (type IN ('monthly','quarterly','annual')),
  period             VARCHAR(50),
  weightage          INT NOT NULL DEFAULT 10 CHECK (weightage BETWEEN 1 AND 100),
  completion_percent INT NOT NULL DEFAULT 0  CHECK (completion_percent BETWEEN 0 AND 100),
  status             VARCHAR(30) NOT NULL DEFAULT 'not_started'
                       CHECK (status IN ('not_started','in_progress','completed','cancelled')),
  due_date           DATE,
  kpi_metric         VARCHAR(200),
  evidence           JSONB,
  approval_status    VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by        INT REFERENCES employees(id),
  approved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_employee_id ON goals(employee_id);

-- ── Performance Reviews ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_reviews (
  id               SERIAL PRIMARY KEY,
  employee_id      INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id      INT REFERENCES employees(id) ON DELETE SET NULL,
  cycle            VARCHAR(50) NOT NULL,
  type             VARCHAR(20) NOT NULL DEFAULT 'quarterly'
                     CHECK (type IN ('monthly','quarterly','yearly')),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','in_progress','completed')),
  overall_score    INT CHECK (overall_score BETWEEN 0 AND 100),
  parameters       JSONB,
  manager_comments TEXT,
  hr_comments      TEXT,
  hr_approved_at   TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status      ON performance_reviews(status);

-- ── Self Assessments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS self_assessments (
  id                        SERIAL PRIMARY KEY,
  employee_id               INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period                    VARCHAR(50) NOT NULL,
  achievements              TEXT,
  challenges                TEXT,
  strengths                 TEXT,
  weaknesses                TEXT,
  career_goals              TEXT,
  manager_discussion_notes  TEXT,
  status                    VARCHAR(20) NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','submitted')),
  submitted_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, period)
);

-- ── Screenshots ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshots (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_employee_date
  ON screenshots(employee_id, captured_at);

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(30) NOT NULL DEFAULT 'system'
               CHECK (type IN ('review','task','approval','system')),
  title      VARCHAR(200) NOT NULL,
  message    TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- ── Holidays ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holidays (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  date       DATE NOT NULL UNIQUE,
  type       VARCHAR(20) NOT NULL DEFAULT 'national'
               CHECK (type IN ('national','company')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Shifts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  start_time VARCHAR(10),
  end_time   VARCHAR(10),
  days       VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── System Settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(60),
  resource_id   INT,
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ═══════════════════════════════════════════════════════════════
-- Default system settings
-- ═══════════════════════════════════════════════════════════════
INSERT INTO system_settings (key, value) VALUES
  ('screenshot_interval_minutes', '10'),
  ('screenshot_enabled',          'true'),
  ('screenshot_encrypt',          'true'),
  ('company_name',                'EPIP Technologies Inc.'),
  ('company_email',               'info@epip.com'),
  ('timezone',                    'America/New_York'),
  ('review_reminder_days',        '7')
ON CONFLICT (key) DO NOTHING;

SELECT 'EPIP schema created successfully.' AS status;
