-- TRUNCATE ALL DATA FROM TRACKERA DATABASE
-- WARNING: This will delete ALL data from the specified schema
-- Make sure to backup your data before running this script!

-- Set the schema you want to truncate (change this to your actual tenant schema)
-- Example: company_test_company, company_moore_consulting, etc.
SET search_path TO "company_11111111-1111-1111-1111-111111111111", public;

-- Disable triggers to avoid foreign key constraint issues during truncation
SET session_replication_role = replica;

-- Truncate all main tables (CASCADE will handle foreign key dependencies)
TRUNCATE TABLE time_entries CASCADE;
TRUNCATE TABLE time_allocations CASCADE;
TRUNCATE TABLE project_budgets CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE employees CASCADE;

-- If you have calendar-related tables, uncomment these lines:
-- TRUNCATE TABLE calendar_connections CASCADE;
-- TRUNCATE TABLE calendar_events CASCADE;
-- TRUNCATE TABLE calendar_subscriptions CASCADE;

-- If you have employee reviews table, uncomment this:
-- TRUNCATE TABLE employee_reviews CASCADE;

-- If you have report jobs table, uncomment this:
-- TRUNCATE TABLE report_jobs CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify the truncation
SELECT
    'employees' as table_name, COUNT(*) as row_count FROM employees
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'time_entries', COUNT(*) FROM time_entries
UNION ALL
SELECT 'time_allocations', COUNT(*) FROM time_allocations
UNION ALL
SELECT 'project_budgets', COUNT(*) FROM project_budgets;

-- Success message
SELECT 'All data has been truncated successfully!' as status;
