-- MIGRATION: Update time_entries table in tenant schema
-- Run this in Supabase SQL Editor
--
-- This script updates the time_entries table in the tenant schema to match
-- the expected structure used by the API service.

-- Switch to tenant schema
SET search_path TO "company_11111111-1111-1111-1111-111111111111", public;

-- Check if time_entries table exists and has the old schema (TIME columns instead of TIMESTAMPTZ)
-- If it does, we need to recreate it with the correct schema

-- First, backup any existing data (if table exists)
CREATE TABLE IF NOT EXISTS time_entries_backup AS
SELECT * FROM time_entries WHERE false;

-- Only backup if the table has data
INSERT INTO time_entries_backup
SELECT * FROM time_entries
WHERE EXISTS (SELECT 1 FROM time_entries LIMIT 1);

-- Drop the old table
DROP TABLE IF EXISTS time_entries;

-- Create time_entries table with correct schema (matching API expectations)
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID,
    employee_id UUID NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    date DATE NOT NULL,
    minutes INTEGER,
    billable BOOLEAN DEFAULT false,
    calendar_event_id UUID,
    created_by_user_id UUID,
    updated_by_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_id ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_calendar_event_id ON time_entries(calendar_event_id);

-- Reload schema cache so Supabase sees the new table
NOTIFY pgrst, 'reload config';

-- Verify the table was created correctly
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'company_11111111-1111-1111-1111-111111111111'
AND table_name = 'time_entries'
ORDER BY ordinal_position;
