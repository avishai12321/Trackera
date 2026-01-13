const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSync() {
    console.log('--- Full Manual Sync Debug ---');

    const { data: connection, error: connError } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('status', 'ACTIVE')
        .limit(1)
        .single();

    if (connError || !connection) {
        console.error('No active connection found:', connError?.message);
        return;
    }

    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
        access_token: connection.access_token_encrypted,
        refresh_token: connection.refresh_token_encrypted
    });

    const calendar = google.calendar({ version: 'v3', auth: client });

    try {
        console.log('Fetching events from Dec 1, 2025 to Jan 31, 2026...');
        const res = await calendar.events.list({
            calendarId: 'primary',
            singleEvents: true,
            maxResults: 250,
            timeMin: '2025-12-01T00:00:00Z',
            timeMax: '2026-01-31T23:59:59Z',
            orderBy: 'startTime'
        });

        const items = res.data.items || [];
        console.log(`Found ${items.length} events in Google.`);

        for (const event of items) {
            const startAt = event.start.dateTime || event.start.date;
            const endAt = event.end.dateTime || event.end.date;
            if (!startAt || !endAt) continue;

            const { error: upsertError } = await supabase
                .from('calendar_events')
                .upsert({
                    tenant_id: connection.tenant_id,
                    connection_id: connection.id,
                    provider: connection.provider,
                    provider_event_id: event.id,
                    title: event.summary || '(No Title)',
                    start_at: new Date(startAt).toISOString(),
                    end_at: new Date(endAt).toISOString(),
                    is_all_day: !event.start.dateTime,
                    updated_at_provider: new Date().toISOString(),
                    synced_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,connection_id,provider,provider_event_id' });

            if (upsertError) {
                console.error(`  ❌ Failed: ${event.summary}:`, upsertError.message);
            } else {
                if (startAt.includes('2025-12-30')) {
                    console.log(`  ⭐ Synced target event: ${event.summary} (${startAt})`);
                }
            }
        }
        console.log('Upsert completion finished.');

    } catch (e) {
        console.error('Error:', e.message);
    }
}

runSync();
