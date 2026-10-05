-- Migration 029: Add file attachment support to task_comments
-- Allows PM and employees to attach files (images, PDFs, docs) in task chat

ALTER TABLE task_comments
  ADD COLUMN IF NOT EXISTS file_url       TEXT,
  ADD COLUMN IF NOT EXISTS file_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_type      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS file_size_kb   INT;
