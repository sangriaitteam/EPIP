-- Migration 012: Fix projects table schema
-- Adds columns that projectController.js expects but were missing from 010_projects.sql
-- Safe to re-run (IF NOT EXISTS / DO NOTHING guards)

-- 1. client — free-text client/company name
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client VARCHAR(200);

-- 2. deadline — the project due date
--    (migration 010 used end_date; controller + frontend both use deadline)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deadline DATE;

-- 3. project_manager — free-text name of the project manager
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_manager VARCHAR(200);

-- 4. Fix default status value to match frontend STATUS_OPTIONS
--    010 default was 'active'; frontend/controller use 'planning'
ALTER TABLE projects
  ALTER COLUMN status SET DEFAULT 'planning';

-- 5. Backfill: rows inserted with old default 'active' → remap to 'in_progress'
--    so existing data stays consistent with the new status set
UPDATE projects
  SET status = 'in_progress'
  WHERE status = 'active';

SELECT 'projects schema updated (client, deadline, project_manager added)' AS status;
