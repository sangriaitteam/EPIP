-- Migration 016: Add active_window_title and monitor metadata to screenshots
-- Populated by the EPIP Desktop Agent on every capture

ALTER TABLE screenshots
  ADD COLUMN IF NOT EXISTS active_window_title VARCHAR(512),
  ADD COLUMN IF NOT EXISTS monitor_name        VARCHAR(128),
  ADD COLUMN IF NOT EXISTS monitor_count       SMALLINT DEFAULT 1;

-- Index for searching by window title (HR can search "VS Code", "Excel", etc.)
CREATE INDEX IF NOT EXISTS idx_screenshots_window
  ON screenshots (active_window_title)
  WHERE active_window_title IS NOT NULL;

SELECT 'Migration 016 complete — active_window_title added to screenshots' AS status;
