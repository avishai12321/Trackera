const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEmployee() {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const userId = 'a28968d1-a468-4709-acc5-43007386c330';

    const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Found ${employees.length} employees.`);
        employees.forEach(e => {
            console.log(`- ID: ${e.id}, Tenant: ${e.tenant_id}, User: ${e.user_id}`);
        });
    }
}

checkEmployee();
