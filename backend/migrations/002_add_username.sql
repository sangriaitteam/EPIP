-- Add username column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;

-- Set default usernames from email prefix for existing users
UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL AND email != '';

SELECT 'username column added successfully' AS status;
