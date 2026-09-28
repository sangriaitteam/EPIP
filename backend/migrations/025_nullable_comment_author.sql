-- Migration 025 — Allow NULL author_id in task_comments
-- Needed so Project Managers (who have no employees row) can post comments
ALTER TABLE task_comments
  ALTER COLUMN author_id DROP NOT NULL;

-- Also store the commenter's display name directly for non-employee users
ALTER TABLE task_comments
  ADD COLUMN IF NOT EXISTS author_name_override VARCHAR(150);
