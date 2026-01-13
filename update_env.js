const fs = require('fs');
const path = require('path');

const webEnvPath = path.join('apps', 'web', '.env.local');
const apiEnvPath = path.join('apps', 'api', '.env');

try {
    // Read web env
    const webEnv = fs.readFileSync(webEnvPath, 'utf8').replace(/^\uFEFF/, '');

    // Extract Supabase values
    const urlMatch = webEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const anonKeyMatch = webEnv.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

    const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
    const supabaseAnonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';

    console.log('Supabase URL:', supabaseUrl);
    console.log('Anon Key length:', supabaseAnonKey.length);
    console.log('Anon Key (first 50 chars):', supabaseAnonKey.substring(0, 50));
    console.log('Anon Key (last 50 chars):', supabaseAnonKey.substring(supabaseAnonKey.length - 50));

    // Read existing API env
    let apiEnv = fs.readFileSync(apiEnvPath, 'utf8');

    // Remove old Supabase entries
    apiEnv = apiEnv.split('\n').filter(line =>
        !line.startsWith('NEXT_PUBLIC_SUPABASE_URL=') &&
        !line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') &&
        !line.startsWith('SUPABASE_SERVICE_ROLE_KEY=') &&
        !line.startsWith('SUPABASE_JWT_SECRET=') &&
        !line.includes('PLACEHOLDER')
    ).join('\n');

    // Add new Supabase entries
    apiEnv += `\nNEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}\n`;
    apiEnv += `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}\n`;
    apiEnv += `SUPABASE_SERVICE_ROLE_KEY=${supabaseAnonKey}\n`;

    fs.writeFileSync(apiEnvPath, apiEnv);
    console.log('\n✓ Updated apps/api/.env successfully');

} catch (e) {
    console.error('Error:', e.message);
}
