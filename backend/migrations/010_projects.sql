-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200)  NOT NULL,
  description   TEXT,
  type          VARCHAR(30)   NOT NULL DEFAULT 'pre-production',
  -- type: pre-production | production | post-production
  status        VARCHAR(20)   NOT NULL DEFAULT 'active',
  -- status: active | completed | on-hold | cancelled
  start_date    DATE,
  end_date      DATE,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Project members (employees assigned to project)
CREATE TABLE IF NOT EXISTS project_members (
  id            SERIAL PRIMARY KEY,
  project_id    INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id   INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role          VARCHAR(100) DEFAULT 'member',  -- e.g. Lead, Member, Reviewer
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_type   ON projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_pm_project      ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_employee     ON project_members(employee_id);

SELECT 'projects and project_members tables created' AS status;
