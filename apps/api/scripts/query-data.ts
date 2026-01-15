import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        db: {
            schema: 'public',
        },
    },
);

async function main() {
    // Try using raw SQL instead since RLS might be blocking
    const { data, error } = await supabase.rpc('exec_sql', {
        query: `
            SELECT 'tenants' as table_name, json_agg(t) as data FROM tenants t
            UNION ALL
            SELECT 'users', json_agg(u) FROM users u
            UNION ALL
            SELECT 'employees', json_agg(e) FROM employees e
            UNION ALL
            SELECT 'clients', json_agg(c) FROM clients c
            UNION ALL
            SELECT 'projects', json_agg(p) FROM projects p
        `
    });

    if (error) {
        console.log('RPC not available, trying direct connection...');
        // Fall back to direct PostgreSQL query via DATABASE_URL
        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.DIRECT_URL,
        });

        await client.connect();

        console.log('=== TENANTS ===');
        const tenants = await client.query('SELECT * FROM tenants');
        console.log(JSON.stringify(tenants.rows, null, 2));

        console.log('\n=== USERS ===');
        const users = await client.query('SELECT id, email, username, tenant_id FROM users');
        console.log(JSON.stringify(users.rows, null, 2));

        console.log('\n=== EMPLOYEES ===');
        const employees = await client.query('SELECT id, first_name, last_name, position, department, tenant_id FROM employees');
        console.log(JSON.stringify(employees.rows, null, 2));

        console.log('\n=== CLIENTS ===');
        const clients = await client.query('SELECT * FROM clients');
        console.log(JSON.stringify(clients.rows, null, 2));

        console.log('\n=== PROJECTS ===');
        const projects = await client.query('SELECT id, name, code, status, tenant_id FROM projects');
        console.log(JSON.stringify(projects.rows, null, 2));

        await client.end();
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

main();
