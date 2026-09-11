-- Add all missing document URL columns to employee_verifications
-- and education_type to track which qualification path was chosen

ALTER TABLE employee_verifications
  ADD COLUMN IF NOT EXISTS aadhaar_url           TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS education_type        VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marks_10th_url        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marks_12th_url        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS degree_marksheet_url  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diploma_marksheet_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diploma_cert_url      TEXT DEFAULT NULL;

-- Rename existing columns to match new naming convention (if they exist as old names)
-- photo_url already exists from 004 migration — keep as is
-- marksheet_url already exists — keep as fallback
-- degree_url already exists — keep as fallback
-- experience_letter_url already exists — keep as is
-- relieving_letter_url already exists — keep as is

SELECT 'document URL columns added to employee_verifications' AS status;
