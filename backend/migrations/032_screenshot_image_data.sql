-- Migration 032: Add image_data column to screenshots for base64 storage
-- This eliminates dependency on file system storage (Railway ephemeral issue)
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS image_data TEXT;
