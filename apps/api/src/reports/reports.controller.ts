
import { Controller, Get, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthGuard } from '@nestjs/passport';
import { TenantContext } from '../shared/tenant-context';
import type { Response } from 'express';

@Controller('reports')
@UseGuards(TenantGuard, AuthGuard('jwt'))
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('export')
    async exportReport(
        @Query('format') format: string,
        @Query('projectId') projectId: string,
        @Query('employeeId') employeeId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Res() res: Response
    ) {
        if (!format || format !== 'csv') {
            throw new BadRequestException('Only csv format supported');
        }

        const tenantId = TenantContext.getTenantId();
        const csv = await this.reportsService.generateCsv(tenantId!, { projectId, employeeId, from, to });

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=report.csv');
        res.send(csv);
    }
}
