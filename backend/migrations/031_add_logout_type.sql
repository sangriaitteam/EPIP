-- Migration 031: Add logout_type to employee_sessions table
ALTER TABLE employee_sessions
  ADD COLUMN IF NOT EXISTS logout_type VARCHAR(20) DEFAULT NULL;
