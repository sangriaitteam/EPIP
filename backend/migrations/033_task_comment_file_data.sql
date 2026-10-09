-- Migration 033: Add file_data column to task_comments for base64 storage
-- Eliminates Railway ephemeral filesystem dependency for task attachments
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS file_data TEXT;

SELECT 'task_comments file_data column added' AS status;
