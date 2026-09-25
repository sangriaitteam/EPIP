-- Migration 020: Add priority column to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low','medium','high'));

SELECT 'project priority column added' AS status;
