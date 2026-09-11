-- Migration 015: Daily Work Reports
-- Employee submits a daily EOD report each working day

CREATE TABLE IF NOT EXISTS daily_reports (
  id              SERIAL PRIMARY KEY,
  employee_id     INT         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  report_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  work_summary    TEXT        NOT NULL,          -- What did you do today?
  achievements    TEXT,                          -- Any wins / completions?
  blockers        TEXT,                          -- Any blockers / issues?
  plan_tomorrow   TEXT,                          -- What's planned for tomorrow?
  mood            VARCHAR(20) NOT NULL DEFAULT 'good',
                                                 -- great | good | neutral | tough | bad
  status          VARCHAR(20) NOT NULL DEFAULT 'submitted',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, report_date)               -- one report per employee per day
);

CREATE INDEX IF NOT EXISTS idx_dr_employee ON daily_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_dr_date     ON daily_reports(report_date);

SELECT 'daily_reports table created' AS status;
