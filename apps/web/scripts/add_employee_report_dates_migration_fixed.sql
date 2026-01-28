-- Migration: Add first_report_date and last_report_date to employees table
-- Date: 2026-01-28
-- Description: Adds tracking for first and last time entry dates for dashboard analytics
-- NOTE: This needs to be run for EACH tenant schema

-- For tenant: 11111111-1111-1111-1111-111111111111
DO $$
BEGIN
    -- Add first_report_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'company.11111111-1111-1111-1111-111111111111'
        AND table_name = 'employees'
        AND column_name = 'first_report_date'
    ) THEN
        EXECUTE 'ALTER TABLE "company.11111111-1111-1111-1111-111111111111".employees ADD COLUMN first_report_date DATE';
        RAISE NOTICE 'Added first_report_date column';
    ELSE
        RAISE NOTICE 'first_report_date column already exists';
    END IF;

    -- Add last_report_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'company.11111111-1111-1111-1111-111111111111'
        AND table_name = 'employees'
        AND column_name = 'last_report_date'
    ) THEN
        EXECUTE 'ALTER TABLE "company.11111111-1111-1111-1111-111111111111".employees ADD COLUMN last_report_date DATE';
        RAISE NOTICE 'Added last_report_date column';
    ELSE
        RAISE NOTICE 'last_report_date column already exists';
    END IF;
END $$;

-- Optional: Populate existing employees with their actual first and last report dates
-- from existing time_entries (if any exist)
UPDATE "company.11111111-1111-1111-1111-111111111111".employees e
SET
    first_report_date = COALESCE(
        (SELECT MIN(te.date)
         FROM "company.11111111-1111-1111-1111-111111111111".time_entries te
         WHERE te.employee_id = e.id),
        e.first_report_date
    ),
    last_report_date = COALESCE(
        (SELECT MAX(te.date)
         FROM "company.11111111-1111-1111-1111-111111111111".time_entries te
         WHERE te.employee_id = e.id),
        e.last_report_date
    )
WHERE EXISTS (
    SELECT 1 FROM "company.11111111-1111-1111-1111-111111111111".time_entries te WHERE te.employee_id = e.id
);
