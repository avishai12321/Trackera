-- Check calendar connections
SELECT 
    id,
    tenant_id,
    user_id,
    provider,
    status,
    last_sync_at,
    created_at
FROM calendar_connections
ORDER BY created_at DESC;

-- Check calendar events
SELECT 
    COUNT(*) as event_count,
    connection_id,
    provider
FROM calendar_events
GROUP BY connection_id, provider;
