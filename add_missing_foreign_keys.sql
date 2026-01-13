-- ADD MISSING FOREIGN KEYS FOR CALENDAR INTEGRATION
-- Run this in Supabase SQL Editor

-- 1. Add foreign key from calendar_connections to tenants
ALTER TABLE "calendar_connections" DROP CONSTRAINT IF EXISTS calendar_connections_tenant_id_fkey;
ALTER TABLE "calendar_connections" 
ADD CONSTRAINT calendar_connections_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 2. Add foreign key from calendar_connections to users
ALTER TABLE "calendar_connections" DROP CONSTRAINT IF EXISTS calendar_connections_user_id_fkey;
ALTER TABLE "calendar_connections" 
ADD CONSTRAINT calendar_connections_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id);

-- 3. Add foreign key from calendar_events to tenants
ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS calendar_events_tenant_id_fkey;
ALTER TABLE "calendar_events" 
ADD CONSTRAINT calendar_events_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 4. Add foreign key from calendar_events to calendar_connections
ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS calendar_events_connection_id_fkey;
ALTER TABLE "calendar_events" 
ADD CONSTRAINT calendar_events_connection_id_fkey 
FOREIGN KEY (connection_id) REFERENCES calendar_connections(id) ON DELETE CASCADE;

-- 5. Add foreign key from time_entries to calendar_events
-- Check if table exists first as it might be in different schema, but let's assume public.
ALTER TABLE "time_entries" DROP CONSTRAINT IF EXISTS time_entries_calendar_event_id_fkey;
ALTER TABLE "time_entries" 
ADD CONSTRAINT time_entries_calendar_event_id_fkey 
FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id) ON DELETE SET NULL;
