
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';

@Module({
    imports: [PrismaModule, TimeEntriesModule],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule { }
