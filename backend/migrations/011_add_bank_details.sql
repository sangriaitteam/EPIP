-- Add bank account details to employee_verifications
ALTER TABLE employee_verifications
  ADD COLUMN IF NOT EXISTS bank_account_name   VARCHAR(200) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(30)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_ifsc_code      VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_branch         VARCHAR(200) DEFAULT NULL;

SELECT 'bank details columns added to employee_verifications' AS status;
