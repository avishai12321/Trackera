-- FIX RLS POLICIES FOR EMPLOYEES AND TIME ENTRIES
-- Run this in Supabase SQL Editor

-- Disable and Re-enable RLS to clear old policies if needed, or just DROP them.
-- But safest is to just replace them.

-- EMPLOYEES
DROP POLICY IF EXISTS "Users can view employees in their tenant" ON employees;
CREATE POLICY "Allow all for employees" ON employees FOR ALL USING (true) WITH CHECK (true);

-- TIME ENTRIES
DROP POLICY IF EXISTS "Users can view time entries in their tenant" ON time_entries;
DROP POLICY IF EXISTS "Users can insert time entries in their tenant" ON time_entries;
DROP POLICY IF EXISTS "Users can update time entries in their tenant" ON time_entries;
DROP POLICY IF EXISTS "Users can delete time entries in their tenant" ON time_entries;
CREATE POLICY "Allow all for time_entries" ON time_entries FOR ALL USING (true) WITH CHECK (true);

-- PROJECTS (Just in case)
DROP POLICY IF EXISTS "Users can view projects in their tenant" ON projects;
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);
