const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
    console.log('--- Diagnosis Start ---');

    // 1. Check connections
    const { data: connections, error: connError } = await supabase
        .from('calendar_connections')
        .select('*');

    console.log('Connections:', connections?.length || 0);
    if (connections) {
        connections.forEach(c => console.log(`- ID: ${c.id}, User: ${c.user_id}, Provider: ${c.provider}, Status: ${c.status}`));
    }
    if (connError) console.error('Connection Error:', connError);

    // 2. Check events
    const { data: events, error: eventError } = await supabase
        .from('calendar_events')
        .select('id, title, start_at, tenant_id, connection_id')
        .limit(5);

    console.log('Events Sample:', events?.length || 0);
    if (events) {
        events.forEach(e => console.log(`- ${e.title} (${e.start_at}) [Tenant: ${e.tenant_id}]`));
    }
    if (eventError) console.error('Event Error:', eventError);

    // 3. Check employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, user_id, tenant_id');

    console.log('Employees:', employees?.length || 0);
    if (employees) {
        employees.forEach(e => console.log(`- ID: ${e.id}, User: ${e.user_id}, Tenant: ${e.tenant_id}`));
    }
    if (empError) console.error('Employee Error:', empError);

    console.log('--- Diagnosis End ---');
}

diagnose();
