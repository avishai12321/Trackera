const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAllEmployees() {
    const { data, error } = await supabase
        .from('employees')
        .select('*');

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Found ${data.length} employees total.`);
        data.forEach(e => {
            console.log(`- ID: ${e.id}, UserID: ${e.user_id}, Name: ${e.first_name} ${e.last_name}`);
        });
    }
}

listAllEmployees();
