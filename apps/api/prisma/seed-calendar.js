
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Calendar Data...');

    const tenantId = '08a38db9-0846-4d81-98ca-416c754ee4c9';
    const userId = '5148b007-640f-423e-9c7b-3cb2a12ac6ec'; // Alice

    // 1. Create Connection if not exists
    let connection = await prisma.calendarConnection.findFirst({
        where: { userId, provider: 'GOOGLE' }
    });

    if (!connection) {
        connection = await prisma.calendarConnection.create({
            data: {
                tenantId,
                userId,
                provider: 'GOOGLE',
                providerAccountId: 'alice@gmail.com',
                status: 'ACTIVE',
                accessTokenEncrypted: 'mock_token'
            }
        });
        console.log('Created Connection:', connection.id);
    } else {
        console.log('Found Connection:', connection.id);
    }

    // 2. Create Calendar Event for Today
    const today = new Date();
    // Set to 10:00 AM - 11:00 AM today
    const startAt = new Date(today); startAt.setHours(10, 0, 0, 0); // Local time? UTC?
    // Prisma stores as DateTime, Node sends Date.

    // Let's use UTC to avoid confusion or just local.
    // Dashboard verification used 2025-12-30T10:00:00Z.
    // I'll create one at 12:00 PM for 1 hour.
    const eventStart = new Date();
    eventStart.setHours(12, 0, 0, 0);
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(13, 0, 0, 0);

    const event = await prisma.calendarEvent.create({
        data: {
            // id: auto-generated
            tenantId,
            connectionId: connection.id,
            provider: 'GOOGLE',
            providerEventId: 'evt_' + Math.random(),
            title: 'Meeting with Client X',
            startAt: eventStart,
            endAt: eventEnd,
            isAllDay: false,
            updatedAtProvider: new Date()
        }
    });

    console.log('Created Event:', event.id, event.title);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
