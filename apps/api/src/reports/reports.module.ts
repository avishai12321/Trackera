
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TimeEntriesModule } from '../time-entries/time-entries.module';

@Module({
    imports: [TimeEntriesModule],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule { }
