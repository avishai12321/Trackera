const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAllTables() {
    // Query pg_catalog directly
    const { data, error } = await supabase.rpc('get_tables_status'); // If exists

    // Since I can't guarantee RPCs, I'll try to use the REST API's underlying OpenAPI spec if I could, but I can't.
    // I'll try to query a table that MUST exist, like 'employees' or 'projects' which I saw in the SQL files.

    const { data: emp, error: errEmp } = await supabase.from('employees').select('*').limit(1);
    console.log('Employees Check:', errEmp ? `❌ ${errEmp.message}` : '✅ Exists');

    const { data: p, error: errP } = await supabase.from('projects').select('*').limit(1);
    console.log('Projects Check:', errP ? `❌ ${errP.message}` : '✅ Exists');

    const { data: c, error: errC } = await supabase.from('calendar_connections').select('*').limit(1);
    console.log('Calendar Connections Check:', errC ? `❌ ${errC.message}` : '✅ Exists');
}

listAllTables();
