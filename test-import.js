/**
 * Test script for import endpoint
 * Usage: node test-import.js <path-to-excel-file>
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjFkMzZlMmIyLTBjNWItNDc1OS1hMjAwLWY3YTQ0N2FhODdjNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F2d2p4b2Joc2NubmtibXloa3d1LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhMjg5NjhkMS1hNDY4LTQ3MDktYWNjNS00MzAwNzM4NmMzMzAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY5NjAxNTQ1LCJpYXQiOjE3Njk1OTc5NDUsImVtYWlsIjoiYWRtaW5AdGVzdGNvbXBhbnkuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJjb21wYW55X2lkIjoiMTExMTExMTEtMTExMS0xMTExLTExMTEtMTExMTExMTExMTExIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzY5NTkwOTMyfV0sInNlc3Npb25faWQiOiJhNGIxN2E3MS0wYmVhLTRhOWUtOWFhNS0xNzVhMWQwOGMyZGQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.AFm89IhaQQhzvoafCMAIuptQcMqtEEqKERf74o14PeuLOMzZnxb5dTZ4587cUYoHyt7q3N7XxxwGr9wM-q29lQ';
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function testImport(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        console.error('Please provide a valid file path');
        console.log('Usage: node test-import.js <path-to-excel-file>');
        process.exit(1);
    }

    console.log('Testing import endpoint...');
    console.log('File:', filePath);

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    try {
        const response = await fetch(`${API_URL}/import/excel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'x-tenant-id': TENANT_ID,
                ...form.getHeaders()
            },
            body: form
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error('Import failed!');
            process.exit(1);
        }

        console.log('\n✅ Import successful!');
        console.log(`- Clients created: ${data.clientsCreated}`);
        console.log(`- Employees created: ${data.employeesCreated}`);
        console.log(`- Projects created: ${data.projectsCreated}`);
        console.log(`- Time entries created: ${data.timeEntriesCreated}`);

        if (data.warnings.length > 0) {
            console.log(`\n⚠️ Warnings (${data.warnings.length}):`);
            data.warnings.forEach(w => console.log(`  - ${w}`));
        }

        if (data.errors.length > 0) {
            console.log(`\n❌ Errors (${data.errors.length}):`);
            data.errors.forEach(e => console.log(`  - ${e}`));
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Get file path from command line
const filePath = process.argv[2];
testImport(filePath);
