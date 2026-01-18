-- MULTI-TENANT SCHEMA SECURITY MIGRATION
-- Run this in Supabase SQL Editor
-- This migrates calendar tables from public to tenant schema for proper data isolation

-- ============================================
-- STEP 1: Add schema_name column to tenants table
-- ============================================
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS schema_name TEXT;

-- Set schema name for existing tenant
UPDATE public.tenants
SET schema_name = 'company_' || id::text
WHERE schema_name IS NULL;

-- Add unique constraint (drop first if exists to avoid error)
ALTER TABLE public.tenants
DROP CONSTRAINT IF EXISTS tenants_schema_name_unique;

ALTER TABLE public.tenants
ADD CONSTRAINT tenants_schema_name_unique UNIQUE (schema_name);

-- ============================================
-- STEP 2: Switch to tenant schema
-- ============================================
SET search_path TO "company_11111111-1111-1111-1111-111111111111", public;

-- ============================================
-- STEP 3: Create project_members table (connects projects to employees)
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, project_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_tenant ON project_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee ON project_members(employee_id);

-- RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for project_members" ON project_members;
CREATE POLICY "Allow all for project_members" ON project_members FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STEP 4: Create calendar_connections table in tenant schema
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    provider "CalendarProvider" NOT NULL,
    provider_account_id TEXT,
    scopes TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    status "ConnectionStatus" DEFAULT 'ACTIVE',
    sync_cursor TEXT,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_tenant ON calendar_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id);

-- ============================================
-- STEP 5: Create calendar_events table in tenant schema
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
    provider "CalendarProvider" NOT NULL,
    provider_event_id TEXT NOT NULL,
    ical_uid TEXT,
    title TEXT,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    timezone TEXT,
    is_all_day BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    location TEXT,
    organizer TEXT,
    attendees JSONB,
    attendees_count INTEGER DEFAULT 0,
    conference_link TEXT,
    event_status TEXT DEFAULT 'confirmed',
    visibility TEXT DEFAULT 'default',
    updated_at_provider TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, connection_id, provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_connection ON calendar_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at);

-- RLS for calendar tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for calendar_connections" ON calendar_connections;
CREATE POLICY "Allow all for calendar_connections" ON calendar_connections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for calendar_events" ON calendar_events;
CREATE POLICY "Allow all for calendar_events" ON calendar_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- STEP 6: Add calendar_event_id to time_entries if missing
-- ============================================
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS calendar_event_id UUID;

CREATE INDEX IF NOT EXISTS idx_time_entries_calendar_event_id ON time_entries(calendar_event_id);

-- ============================================
-- STEP 7: Migrate existing data from public to tenant schema
-- ============================================
-- Migrate calendar_connections
INSERT INTO calendar_connections (
    id, tenant_id, user_id, provider, provider_account_id, scopes,
    access_token_encrypted, refresh_token_encrypted, token_expires_at,
    status, sync_cursor, last_sync_at, created_at, updated_at
)
SELECT
    id, tenant_id, user_id, provider, provider_account_id, scopes,
    access_token_encrypted, refresh_token_encrypted, token_expires_at,
    status, sync_cursor, last_sync_at, created_at, updated_at
FROM public.calendar_connections
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- Migrate calendar_events (handle columns that may or may not exist in public table)
INSERT INTO calendar_events (
    id, tenant_id, connection_id, provider, provider_event_id, ical_uid,
    title, start_at, end_at, timezone, is_all_day, is_recurring,
    recurrence_rule, location, organizer, attendees_count,
    updated_at_provider, synced_at
)
SELECT
    id, tenant_id, connection_id, provider, provider_event_id, ical_uid,
    title, start_at, end_at, timezone, is_all_day, is_recurring,
    recurrence_rule, location, organizer, attendees_count,
    updated_at_provider, synced_at
FROM public.calendar_events
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 8: Grant permissions
-- ============================================
GRANT USAGE ON SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "company_11111111-1111-1111-1111-111111111111" TO anon, authenticated, service_role;

-- ============================================
-- STEP 9: Reload PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload config';

-- ============================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================
-- Check tenant schema has data:
-- SELECT COUNT(*) as tenant_calendar_connections FROM "company_11111111-1111-1111-1111-111111111111".calendar_connections;
-- SELECT COUNT(*) as tenant_calendar_events FROM "company_11111111-1111-1111-1111-111111111111".calendar_events;

-- After verifying migration, you can drop the old public tables:
-- DROP TABLE IF EXISTS public.calendar_events;
-- DROP TABLE IF EXISTS public.calendar_connections;
