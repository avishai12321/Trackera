const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function findTables() {
    console.log('Searching for calendar_connections table...');
    const schemas = ['public', 'company_test_company', 'auth', 'storage'];

    for (const schema of schemas) {
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            db: { schema: schema }
        });

        try {
            const { error } = await client
                .from('calendar_connections')
                .select('*')
                .limit(1);

            if (error) {
                console.log(`❌ Schema '${schema}': ${error.message}`);
            } else {
                console.log(`✅ Schema '${schema}': Found!`);
            }
        } catch (e) {
            console.log(`❌ Schema '${schema}': Exception ${e.message}`);
        }
    }
}

findTables();
