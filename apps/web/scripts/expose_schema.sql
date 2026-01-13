-- Expose the schema to the PostgREST API
-- This needs to happen so the Supabase JS client can access it
-- You MUST run this in the Supabase Dashboard SQL Editor

-- 1. Add the schema to the exposed schemas list
-- Note: This is an example. In Supabase, you typically do this via the Dashboard settings:
-- Go to Settings > API > Exposed schemas
-- And add "company_11111111-1111-1111-1111-111111111111" to the list.

-- However, we can try to do it via SQL if we have superuser permissions (rare in shared tier)
-- or simply verify permissions.

-- 2. Grant usage on the schema to the anon and authenticated roles
GRANT USAGE ON SCHEMA "company_test_company" TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;

-- 3. Grant access to all tables in the schema
GRANT ALL ON ALL TABLES IN SCHEMA "company_test_company" TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;

-- 4. Grant access to sequences (for auto-incrementing IDs if any)
GRANT ALL ON ALL SEQUENCES IN SCHEMA "company_test_company" TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;

-- 5. IMPORTANT: Reload the schema cache
NOTIFY pgrst, 'reload config';
