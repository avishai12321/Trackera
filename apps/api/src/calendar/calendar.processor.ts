import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Processor('calendar-sync')
export class CalendarProcessor extends WorkerHost {
    private readonly logger = new Logger(CalendarProcessor.name);

    constructor(private readonly calendarService: CalendarService) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing job ${job.id} of type ${job.name}`);
        switch (job.name) {
            case 'sync-events':
                return this.calendarService.syncEvents(job.data.connectionId);
            default:
                throw new Error(`Unknown job name: ${job.name}`);
        }
    }
}

