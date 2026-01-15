-- FORCE FULL CALENDAR RE-SYNC
-- This clears the sync cursor so the next sync fetches ALL events (not just changes)
-- Run this in Supabase SQL Editor, then click "Sync Calendar" in the app

-- Clear sync cursor for all connections
UPDATE calendar_connections 
SET sync_cursor = NULL;

-- Optional: Clear existing events to get fresh data with all new fields
-- Uncomment the line below if you want to delete and re-fetch all events
-- DELETE FROM calendar_events;

-- After running this, click "Sync Calendar" in the app to fetch fresh data
