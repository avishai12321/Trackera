
import { Injectable } from '@nestjs/common';
import { Parser } from 'json2csv';
import { TimeEntriesService } from '../time-entries/time-entries.service';

@Injectable()
export class ReportsService {
    constructor(
        private timeEntriesService: TimeEntriesService
    ) { }


    async generateCsv(tenantId: string, filter: any) {
        // Reuse findAll from TimeEntriesService or query directly
        // filter: { projectId, employeeId, from, to }
        const entries = await this.timeEntriesService.findAll(
            tenantId,
            filter.employeeId,
            filter.projectId,
            filter.from,
            filter.to
        );

        const fields = ['date', 'project.name', 'employee.firstName', 'employee.lastName', 'description', 'minutes', 'billable'];
        const opts = { fields };

        // Flatten data if needed, but json2csv handles dot notation (project.name)

        try {
            const parser = new Parser(opts);
            const csv = parser.parse(entries);
            return csv;
        } catch (err) {
            console.error(err);
            throw new Error('CSV Generation Failed');
        }
    }
}
