const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEventsFull() {
    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Checking ${data.length} events...`);
        data.forEach(e => {
            console.log(`- Event: ${e.title}`);
            console.log(`  Connection ID: ${e.connection_id}`);
            console.log(`  Tenant ID: ${e.tenant_id}`);
        });
    }
}

checkEventsFull();
