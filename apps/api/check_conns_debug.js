const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkConnections() {
    const { data, error } = await supabase
        .from('calendar_connections')
        .select('*');

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Found ${data.length} connections.`);
        data.forEach(c => {
            console.log(`- Connection ID: ${c.id}`);
            console.log(`  Tenant ID: ${c.tenant_id}`);
            console.log(`  User ID: ${c.user_id}`);
            console.log(`  Provider: ${c.provider}`);
        });
    }
}

checkConnections();
