-- FIX MISSING CALENDAR TABLES
-- Run this in Supabase SQL Editor

-- 1. Ensure Enums exist in public schema
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalendarProvider') THEN
        CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConnectionStatus') THEN
        CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ERROR');
    END IF;
END $$;

-- 2. Create calendar_connections table
CREATE TABLE IF NOT EXISTS "calendar_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "scopes" TEXT,
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_sync_at" TIMESTAMPTZ,
    "sync_cursor" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- 3. Create calendar_events table
CREATE TABLE IF NOT EXISTS "calendar_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "ical_uid" TEXT,
    "title" TEXT,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "timezone" TEXT,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "location" TEXT,
    "organizer" TEXT,
    "attendees_count" INTEGER,
    "updated_at_provider" TIMESTAMPTZ,
    "synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- 4. Create Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_tenant_id_user_id_provider_key" ON "calendar_connections"("tenant_id", "user_id", "provider");
CREATE INDEX IF NOT EXISTS "calendar_events_tenant_id_connection_id_start_at_idx" ON "calendar_events"("tenant_id", "connection_id", "start_at");
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_events_tenant_id_connection_id_provider_provider_e_key" ON "calendar_events"("tenant_id", "connection_id", "provider", "provider_event_id");

-- 5. Enable RLS
ALTER TABLE "calendar_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Simple permissive policies for dev, matching your other tables)
DROP POLICY IF EXISTS "Allow all for calendar_connections" ON "calendar_connections";
CREATE POLICY "Allow all for calendar_connections" ON "calendar_connections" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for calendar_events" ON "calendar_events";
CREATE POLICY "Allow all for calendar_events" ON "calendar_events" FOR ALL USING (true) WITH CHECK (true);

-- 7. Add updated_at trigger for calendar_connections
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_calendar_connections_updated_at ON "calendar_connections";
CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON "calendar_connections" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
