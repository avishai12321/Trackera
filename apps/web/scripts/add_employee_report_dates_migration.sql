-- Migration: Add first_report_date and last_report_date to employees table
-- Date: 2026-01-28
-- Description: Adds tracking for first and last time entry dates for dashboard analytics

-- Add columns if they don't exist
DO $$
BEGIN
    -- Add first_report_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'first_report_date'
    ) THEN
        ALTER TABLE employees ADD COLUMN first_report_date DATE;
    END IF;

    -- Add last_report_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'last_report_date'
    ) THEN
        ALTER TABLE employees ADD COLUMN last_report_date DATE;
    END IF;
END $$;

-- Optional: Populate existing employees with their actual first and last report dates
-- from existing time_entries (if any exist)
UPDATE employees e
SET
    first_report_date = COALESCE(
        (SELECT MIN(te.date)
         FROM time_entries te
         WHERE te.employee_id = e.id),
        e.first_report_date
    ),
    last_report_date = COALESCE(
        (SELECT MAX(te.date)
         FROM time_entries te
         WHERE te.employee_id = e.id),
        e.last_report_date
    )
WHERE EXISTS (
    SELECT 1 FROM time_entries te WHERE te.employee_id = e.id
);
