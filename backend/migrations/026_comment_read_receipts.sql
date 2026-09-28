-- Migration 026 — Read receipts for task comments (WhatsApp-style blue ticks)
ALTER TABLE task_comments
  ADD COLUMN IF NOT EXISTS is_read  BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at  TIMESTAMPTZ;

-- Index for fast lookup of unread messages per task
CREATE INDEX IF NOT EXISTS idx_task_comments_task_read
  ON task_comments(task_id, is_read);
