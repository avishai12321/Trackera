import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { CalendarProcessor } from './calendar.processor';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue({
            name: 'calendar-sync',
        }),
    ],
    controllers: [CalendarController],
    providers: [CalendarService, CalendarProcessor],
    exports: [CalendarService]
})
export class CalendarModule { }
