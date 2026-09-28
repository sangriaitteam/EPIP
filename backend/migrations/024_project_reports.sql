-- Migration 024: project_reports table
-- Stores generated report metadata per project

CREATE TABLE IF NOT EXISTS project_reports (
  id            SERIAL PRIMARY KEY,
  project_id    INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_name   VARCHAR(200) NOT NULL,
  report_type   VARCHAR(30)  NOT NULL CHECK (report_type IN ('task','team','project','export')),
  generated_by  INT REFERENCES users(id) ON DELETE SET NULL,
  file_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_reports_project_id ON project_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_created_at ON project_reports(created_at);

SELECT 'project_reports table created.' AS status;
