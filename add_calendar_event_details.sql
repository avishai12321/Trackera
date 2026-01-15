-- Add Enhanced Calendar Event Fields
-- Run this in Supabase SQL Editor

-- Add new columns to calendar_events table
ALTER TABLE "calendar_events" 
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "attendees" JSONB,
ADD COLUMN IF NOT EXISTS "conference_link" TEXT,
ADD COLUMN IF NOT EXISTS "event_status" TEXT DEFAULT 'confirmed',
ADD COLUMN IF NOT EXISTS "visibility" TEXT DEFAULT 'default';

-- Update the organizer column to store email (if not already done)
-- The column already exists, we're just ensuring it's used

-- Update attendees_count to be properly synced
-- The column already exists

-- Add an index on event_status for filtering
CREATE INDEX IF NOT EXISTS "calendar_events_event_status_idx" ON "calendar_events"("event_status");

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calendar_events' 
ORDER BY ordinal_position;
