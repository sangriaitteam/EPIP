-- Migration 028 — Attendance Warning System & Day Lock
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS warning_count  INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_reason  VARCHAR(100);

-- Index for quick locked-day lookups
CREATE INDEX IF NOT EXISTS idx_attendance_locked ON attendance(employee_id, is_locked) WHERE is_locked = true;
