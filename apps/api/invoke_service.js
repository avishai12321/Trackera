const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./src/app.module');
const { TimeEntriesService } = require('./src/time-entries/time-entries.service');

async function test() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(TimeEntriesService);

    const tenantId = '11111111-1111-1111-1111-111111111111';
    const userId = 'a28968d1-a468-4709-acc5-43007386c330';
    const date = '2025-12-30';

    console.log('--- Calling getSuggestions ---');
    try {
        const results = await service.getSuggestions(tenantId, userId, date);
        console.log('Results:', JSON.stringify(results, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    await app.close();
}

test();
