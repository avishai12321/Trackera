const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEnums() {
    console.log('Checking enums...');
    const enums = ['CalendarProvider', 'ConnectionStatus'];

    for (const en of enums) {
        // Query pg_type
        const { data, error } = await supabase.rpc('check_enum_exists', { enum_name: en });
        if (error) {
            // If RPC doesn't exist, try a dummy query
            console.log(`Checking ${en} via dummy query...`);
        }
    }

    // Better way: try to use the type in a dummy cast
    const { error: err1 } = await supabase.rpc('exec_sql', { sql: "SELECT 'GOOGLE'::\"CalendarProvider\"" });
    console.log('CalendarProvider Check:', err1 ? `❌ ${err1.message}` : '✅ Exists');

    const { error: err2 } = await supabase.rpc('exec_sql', { sql: "SELECT 'ACTIVE'::\"ConnectionStatus\"" });
    console.log('ConnectionStatus Check:', err2 ? `❌ ${err2.message}` : '✅ Exists');
}

checkEnums();
