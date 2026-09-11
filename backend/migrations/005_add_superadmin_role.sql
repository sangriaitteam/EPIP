-- Add superadmin to the allowed roles (keep all existing roles)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'admin', 'hr', 'manager', 'employee'));

-- Promote superadmin user
UPDATE users SET role = 'superadmin' WHERE id = 5;

SELECT id, name, username, role FROM users ORDER BY id;

