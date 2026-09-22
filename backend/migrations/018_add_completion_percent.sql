-- Migration 018: Add completion_percent to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS completion_percent SMALLINT NOT NULL DEFAULT 0
    CHECK (completion_percent >= 0 AND completion_percent <= 100);

SELECT 'Migration 018 complete — completion_percent added to projects' AS status;
