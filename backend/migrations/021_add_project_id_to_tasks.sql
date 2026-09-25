-- Migration 021: Add project_id and project_name to tasks table
-- tasks.project_id → FK to projects(id) — optional (task can exist without a project)
-- tasks.project_name → cached project name for display without extra JOIN

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id   INT REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(200);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'hr';

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

SELECT 'tasks: project_id, project_name, source columns added' AS status;
