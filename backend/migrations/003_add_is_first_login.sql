-- Add is_first_login flag to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT false;

-- Employees and managers start with is_first_login = true
UPDATE users SET is_first_login = true
WHERE role IN ('employee', 'manager') AND is_first_login = false;

-- Add index on username for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

SELECT 'is_first_login column and username index added' AS status;
