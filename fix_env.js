const fs = require('fs');
const path = require('path');

const apiEnvPath = path.join('apps', 'api', '.env');
const webEnvPath = path.join('apps', 'web', '.env.local');

try {
    let apiEnvContent = '';
    try {
        apiEnvContent = fs.readFileSync(apiEnvPath, 'utf8');
    } catch (e) {
        console.log('No existing api .env, creating new.');
    }

    const lines = apiEnvContent.split(/\r?\n/);
    const cleanLines = lines.filter(l =>
        (l.startsWith('DATABASE_URL=') ||
            l.startsWith('FRONTEND_URL=') ||
            l.startsWith('GOOGLE_') ||
            l.startsWith('MICROSOFT_') ||
            l.startsWith('JWT_')) &&
        !l.includes('∩╗┐')
    ).map(l => l.replace(/[^\x20-\x7E]+/g, '')); // Remove non-printable chars

    const webEnv = fs.readFileSync(webEnvPath, 'utf8').replace(/^\uFEFF/, '');
    const supabaseUrlMatch = webEnv.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const supabaseAnonKeyMatch = webEnv.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

    const supabaseUrl = supabaseUrlMatch ? supabaseUrlMatch[1].trim() : '';
    const supabaseAnonKey = supabaseAnonKeyMatch ? supabaseAnonKeyMatch[1].trim() : '';

    const newContent = cleanLines.join('\n') + '\n' +
        `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseAnonKey}
`;

    fs.writeFileSync(apiEnvPath, newContent);
    console.log('Fixed .env content:');
    console.log(newContent);
} catch (e) {
    console.error(e);
}
