-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id            SERIAL PRIMARY KEY,
  employee_id   INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type    VARCHAR(50)  NOT NULL DEFAULT 'casual',   -- casual | sick | earned | unpaid
  start_date    DATE         NOT NULL,
  end_date      DATE         NOT NULL,
  days          INT          NOT NULL DEFAULT 1,
  reason        TEXT,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  reviewed_by   INT REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  reviewer_note TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status   ON leave_requests(status);

SELECT 'leave_requests table created' AS status;
