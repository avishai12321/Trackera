-- Rename the schema to match the UUID-based format expected by the application
-- This is necessary because the app generates schema names as "company_{uuid}"

-- 1. Rename the schema
ALTER SCHEMA company_test_company RENAME TO "company_11111111-1111-1111-1111-111111111111";

-- 2. Grant permissions on the NEW schema name
GRANT USAGE ON SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;

-- 3. Notify PostgREST to reload the schema cache so it sees the name change
NOTIFY pgrst, 'reload config';
