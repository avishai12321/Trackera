const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEvents() {
    const date = '2025-12-30';
    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_at', `${date}T00:00:00Z`)
        .lte('start_at', `${date}T23:59:59Z`);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Found ${data.length} events for ${date}`);
        data.forEach(e => console.log(`- ${e.title} (${e.start_at}) [Tenant: ${e.tenant_id}]`));
    }
}

checkEvents();
