const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n=== Supabase Database Configuration ===\n');
console.log('Please get your connection strings from Supabase Dashboard:');
console.log('1. Go to: https://supabase.com/dashboard');
console.log('2. Select your project (avwjxobhscnnkbmyhkwu)');
console.log('3. Go to: Project Settings > Database');
console.log('4. Scroll to "Connection string" section\n');

rl.question('Enter your DATABASE_URL (Transaction pooler - port 6543):\n', (poolerUrl) => {
    rl.question('\nEnter your DIRECT_URL (Session pooler - port 5432):\n', (directUrl) => {
        const envPath = 'apps/api/.env';
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Remove old DATABASE_URL and DIRECT_URL
        envContent = envContent.split('\n').filter(line =>
            !line.startsWith('DATABASE_URL=') &&
            !line.startsWith('DIRECT_URL=')
        ).join('\n');

        // Add new URLs
        envContent += `\nDATABASE_URL="${poolerUrl}"\n`;
        envContent += `DIRECT_URL="${directUrl}"\n`;

        fs.writeFileSync(envPath, envContent);

        console.log('\n✓ Environment variables updated!');
        console.log('\nNext steps:');
        console.log('1. cd apps/api');
        console.log('2. npx prisma migrate deploy');

        rl.close();
    });
});
