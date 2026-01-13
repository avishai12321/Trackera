const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createEmployeeManual() {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const userId = 'a28968d1-a468-4709-acc5-43007386c330';

    console.log(`Creating employee for tenant ${tenantId}, user ${userId}`);

    const { data, error } = await supabase
        .from('employees')
        .insert({
            tenant_id: tenantId,
            user_id: userId,
            first_name: 'Admin',
            last_name: 'User',
            status: 'ACTIVE'
        })
        .select();

    if (error) {
        console.error('Error creating employee:', error);
    } else {
        console.log('Employee created successfully:', data);
    }
}

createEmployeeManual();
