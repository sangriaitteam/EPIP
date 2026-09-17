-- Migration 017: Add project_manager role to users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'admin', 'hr', 'manager', 'employee', 'project_manager'));

SELECT 'Migration 017 complete — project_manager role added' AS status;
