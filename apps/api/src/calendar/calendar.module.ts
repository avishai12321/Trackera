import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { SharedModule } from '../shared/shared.module';

@Module({
    imports: [SharedModule],
    controllers: [CalendarController],
    providers: [CalendarService],
    exports: [CalendarService]
})
export class CalendarModule { }
