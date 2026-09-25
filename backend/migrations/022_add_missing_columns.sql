-- Migration 022: Add missing columns identified in production
-- Safe to re-run (IF NOT EXISTS guards throughout)

-- 1. notifications.link — navigation URL sent with notifications
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS link TEXT;

-- 2. tasks.project_id — FK to projects (optional)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id INT REFERENCES projects(id) ON DELETE SET NULL;

-- 3. tasks.project_name — cached project name
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(200);

-- 4. tasks.source — who created the task (hr / superadmin / project_manager)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'hr';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id     ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_link   ON notifications(user_id) WHERE link IS NOT NULL;

SELECT 'migration 022: notifications.link, tasks.project_id/project_name/source added' AS status;
