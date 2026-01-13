const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkState() {
    console.log('--- Database State Check ---');

    // 1. Check connections
    const { data: connections, error: connError } = await supabase
        .from('calendar_connections')
        .select('*');

    console.log('\n[Calendar Connections]');
    if (connError) console.error('Error:', connError.message);
    else if (connections.length === 0) console.log('No connections found.');
    else connections.forEach(c => console.log(`- ID: ${c.id}, User: ${c.user_id}, Status: ${c.status}, Last Sync: ${c.last_sync_at}`));

    // 2. Check employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*');

    console.log('\n[Employees]');
    if (empError) console.error('Error:', empError.message);
    else if (employees.length === 0) console.log('No employees found.');
    else employees.forEach(e => console.log(`- ID: ${e.id}, User: ${e.user_id}, Name: ${e.first_name} ${e.last_name}`));

    // 3. Check events
    const { data: events, error: eventError } = await supabase
        .from('calendar_events')
        .select('id, title, start_at, connection_id');

    console.log('\n[Calendar Events]');
    if (eventError) console.error('Error:', eventError.message);
    else if (events.length === 0) console.log('No events found in table.');
    else {
        console.log(`Found ${events.length} events. Last 5:`);
        events.slice(-5).forEach(e => console.log(`- ${e.title} (${e.start_at})`));
    }

    console.log('\n--- Check End ---');
}

checkState();
