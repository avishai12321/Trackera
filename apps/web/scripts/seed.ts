import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const SCHEMA = 'company_test_company';
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

// Helpers
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUUID = () => crypto.randomUUID();

function formatValue(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return val.toString();
    // Escape single quotes for SQL
    return `'${val.toString().replace(/'/g, "''")}'`;
}

async function generateSQL() {
    console.log('Generating seed SQL...');
    const statements: string[] = [];

    statements.push(`-- Seed data for schema ${SCHEMA}`);
    statements.push(`SET search_path TO ${SCHEMA}, public;`);
    statements.push('');

    // 1. Employees
    const empIds: string[] = [];
    const roles = ['Developer', 'Designer', 'Product Manager', 'QA', 'DevOps'];

    statements.push('-- Employees');
    for (let i = 0; i < 10; i++) {
        const id = randomUUID();
        empIds.push(id);
        const firstName = `Employee${i}`;
        const lastName = `User${i}`;
        const email = `employee${i}@test.com`;

        statements.push(`INSERT INTO "${SCHEMA}".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            ${formatValue(id)}, ${formatValue(TENANT_ID)}, ${formatValue(firstName)}, ${formatValue(lastName)}, ${formatValue(email)}, 'ACTIVE', ${formatValue(randomItem(roles))}, ${randomInt(50000, 150000)}, ${randomInt(20, 100)}, 160
        );`);
    }
    statements.push('');

    // 2. Clients
    const clientIds: string[] = [];
    statements.push('-- Clients');
    for (let i = 0; i < 10; i++) {
        const id = randomUUID();
        clientIds.push(id);
        const name = `Client Company ${i}`;
        const email = `contact@client${i}.com`;

        statements.push(`INSERT INTO "${SCHEMA}".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            ${formatValue(id)}, ${formatValue(TENANT_ID)}, ${formatValue(name)}, ${formatValue(email)}, 'ACTIVE', 'USD', ${randomInt(50, 200)}
        );`);
    }
    statements.push('');

    // 3. Projects
    const projectIds: string[] = [];
    statements.push('-- Projects');
    for (let i = 0; i < 10; i++) {
        const id = randomUUID();
        projectIds.push(id);
        const name = `Project ${i}`;
        const code = `PRJ-${i}`;

        statements.push(`INSERT INTO "${SCHEMA}".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            ${formatValue(id)}, ${formatValue(TENANT_ID)}, ${formatValue(name)}, ${formatValue(code)}, 'ACTIVE', ${formatValue(randomItem(clientIds))}, ${formatValue(randomItem(empIds))}, ${formatValue(randomItem(['FIXED', 'HOURLY_RATE']))}, ${randomInt(10000, 1000000)}, ${formatValue(new Date().toISOString())}
        );`);
    }
    statements.push('');

    // 4. Project Budgets
    statements.push('-- Project Budgets');
    for (const projId of projectIds) {
        statements.push(`INSERT INTO "${SCHEMA}".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            ${formatValue(TENANT_ID)}, ${formatValue(projId)}, 2024, ${randomInt(1, 12)}, ${randomInt(1000, 20000)}
        ) ON CONFLICT DO NOTHING;`);
    }

    // 5. Time Allocations
    statements.push('');
    statements.push('-- Time Allocations');
    for (let i = 0; i < 10; i++) {
        const pId = randomItem(projectIds);
        const eId = randomItem(empIds);

        statements.push(`INSERT INTO "${SCHEMA}".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            ${formatValue(TENANT_ID)}, ${formatValue(pId)}, ${formatValue(eId)}, 2024, ${randomInt(1, 12)}, ${randomInt(10, 80)}
        ) ON CONFLICT DO NOTHING;`);
    }

    // 6. Time Entries
    statements.push('');
    statements.push('-- Time Entries');
    for (let i = 0; i < 10; i++) {
        const pId = randomItem(projectIds);
        const eId = randomItem(empIds);

        statements.push(`INSERT INTO "${SCHEMA}".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            ${formatValue(TENANT_ID)}, ${formatValue(eId)}, ${formatValue(pId)}, ${formatValue(new Date().toISOString().split('T')[0])}, 60, 1.0, 'Working on stuff', 'MANUAL', true
        );`);
    }

    const outputPath = path.resolve(__dirname, 'seed_data.sql');
    fs.writeFileSync(outputPath, statements.join('\n'));
    console.log(`Generated SQL seed file at: ${outputPath}`);
}

generateSQL().catch(err => console.error(err));
