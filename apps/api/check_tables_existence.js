const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    // There is no direct "list tables" in supabase-js, but we can query information_schema if enabled
    // or just try to select from them.
    const tables = ['tenants', 'users', 'user_roles', 'employees', 'projects', 'time_entries', 'calendar_connections', 'calendar_events'];

    console.log('Checking tables in public schema...');
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ ${table}: ${error.message} (Code: ${error.code})`);
        } else {
            console.log(`✅ ${table}`);
        }
    }
}

listTables();
