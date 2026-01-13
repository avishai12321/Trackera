const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testServiceLogic() {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const userId = 'a28968d1-a468-4709-acc5-43007386c330';
    const dateString = '2025-12-30';

    const date = new Date(dateString);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Querying between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

    const { data: calendarEvents, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('start_at', startOfDay.toISOString())
        .lte('start_at', endOfDay.toISOString());

    if (eventsError) {
        console.error('Error:', eventsError.message);
    } else {
        console.log(`Found ${calendarEvents.length} events.`);
        calendarEvents.forEach(e => console.log(`- ${e.title} (${e.start_at})`));
    }
}

testServiceLogic();
