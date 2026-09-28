-- Migration 027 — Employee Session Log
-- Tracks each login/logout event per employee per day
-- Multiple sessions allowed per day (login multiple times)

CREATE TABLE IF NOT EXISTS employee_sessions (
  id                SERIAL PRIMARY KEY,
  employee_id       INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_id     INT REFERENCES attendance(id) ON DELETE SET NULL,
  login_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at         TIMESTAMPTZ,
  duration_mins     NUMERIC(8,2),        -- net work time (excluding breaks)
  manual_break_mins NUMERIC(8,2) DEFAULT 0,
  screen_off_mins   NUMERIC(8,2) DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_employee_id  ON employee_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_login_at     ON employee_sessions(login_at);
CREATE INDEX IF NOT EXISTS idx_sessions_attendance_id ON employee_sessions(attendance_id);
