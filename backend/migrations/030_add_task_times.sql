-- Migration 030: Add start_time and end_time to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS start_time VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_time   VARCHAR(20) DEFAULT NULL;
