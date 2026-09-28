-- Migration 023: Add 'urgent' to project priority constraint
-- Old constraint only allowed: low, medium, high
-- New constraint allows: low, medium, high, urgent

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_priority_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

SELECT 'Migration 023 complete - urgent priority added to projects' AS status;
