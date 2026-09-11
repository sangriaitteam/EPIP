-- Add department column to employee_verifications
ALTER TABLE employee_verifications
  ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT NULL;

SELECT 'department column added to employee_verifications' AS status;
