-- Migration 013: Fix leave_requests table schema
--
-- Problem: migration 001 created leave_requests with old column names:
--   type, approved_by  (no reviewed_by / reviewer_note / reviewed_at / leave_type)
-- Migration 009 used CREATE TABLE IF NOT EXISTS, so it was silently skipped.
-- leaveController.js uses: leave_type, reviewed_by, reviewed_at, reviewer_note
-- This migration brings the real table in sync with the controller.
-- All ALTER COLUMNs are safe to re-run (IF NOT EXISTS / IF EXISTS guards).

-- 1. Add leave_type (controller uses this; migration 001 called it "type")
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50) NOT NULL DEFAULT 'casual';

-- 2. Backfill leave_type from the old "type" column (if it exists and has data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='leave_requests' AND column_name='type'
  ) THEN
    UPDATE leave_requests SET leave_type = type WHERE leave_type = 'casual' AND type IS NOT NULL;
  END IF;
END $$;

-- 3. Add reviewed_by (controller: SET reviewed_by=$2 on approve/reject)
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS reviewed_by INT REFERENCES users(id);

-- 4. Add reviewed_at
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 5. Add reviewer_note
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS reviewer_note TEXT;

-- 6. Add updated_at (missing from migration 001 definition)
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. Indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status   ON leave_requests(status);

SELECT 'leave_requests schema fixed (leave_type, reviewed_by, reviewed_at, reviewer_note added)' AS status;
