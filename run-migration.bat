@echo off
echo Running migration to add employee report dates...
echo.
echo Please run this SQL in your Supabase SQL Editor:
echo.
type apps\web\scripts\add_employee_report_dates_migration_fixed.sql
echo.
echo.
echo Instructions:
echo 1. Go to your Supabase Dashboard
echo 2. Open SQL Editor
echo 3. Copy the SQL above
echo 4. Run it
echo.
pause
