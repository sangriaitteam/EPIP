-- Migration 014: Attendance Pause/Resume feature
-- Each row = one pause session within a work day
-- Multiple pauses per attendance record are supported

CREATE TABLE IF NOT EXISTS attendance_pauses (
  id             SERIAL PRIMARY KEY,
  attendance_id  INT NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  employee_id    INT NOT NULL REFERENCES employees(id)  ON DELETE CASCADE,
  pause_start    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pause_end      TIMESTAMPTZ,                              -- NULL while still paused
  duration_mins  NUMERIC(6,2),                            -- filled on resume
  reason         VARCHAR(50)  NOT NULL DEFAULT 'other',   -- tea_break | lunch_break | meeting | personal | other
  comment        TEXT,                                     -- optional free-text
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_attendance ON attendance_pauses(attendance_id);
CREATE INDEX IF NOT EXISTS idx_ap_employee   ON attendance_pauses(employee_id);

-- Add total_pause_mins column to attendance for fast checkout calculation
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS total_pause_mins NUMERIC(6,2) NOT NULL DEFAULT 0;

SELECT 'attendance_pauses table and total_pause_mins column created' AS status;
