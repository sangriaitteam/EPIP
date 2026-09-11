-- Add experience_level column to employee_verifications
-- Values: intern | fresher | less_than_1 | 1_2 | 2_3 | 3_5 | 5_10 | 10_plus

ALTER TABLE employee_verifications
  ADD COLUMN IF NOT EXISTS experience_level VARCHAR(20) DEFAULT NULL;

SELECT 'experience_level column added to employee_verifications' AS status;
