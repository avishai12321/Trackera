const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addDescriptionColumn() {
    console.log('Adding description column to projects table...');

    const { data, error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;'
    });

    if (error) {
        console.error('Error:', error);
        console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
        console.log('ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;');
    } else {
        console.log('✓ Description column added successfully!');
    }
}

addDescriptionColumn();
