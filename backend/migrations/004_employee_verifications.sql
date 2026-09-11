-- Employee document verification data (submitted on first login)
CREATE TABLE IF NOT EXISTS employee_verifications (
  id                  SERIAL PRIMARY KEY,
  employee_id         INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  dob                 DATE,
  gender              VARCHAR(10),
  aadhaar_number      VARCHAR(12),
  company_provided_id VARCHAR(50),
  contact_number      VARCHAR(15),
  alternate_number    VARCHAR(15),
  address_line1       TEXT,
  address_line2       TEXT,
  city                VARCHAR(100),
  state               VARCHAR(100),
  pincode             VARCHAR(10),
  has_experience      BOOLEAN NOT NULL DEFAULT false,
  photo_url           TEXT,
  marksheet_url       TEXT,
  degree_url          TEXT,
  experience_letter_url TEXT,
  relieving_letter_url  TEXT,
  verified_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS idx_emp_verifications_employee ON employee_verifications(employee_id);

SELECT 'employee_verifications table created' AS status;
