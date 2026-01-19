import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, Res, Logger } from '@nestjs/common';
import { EmployeeReviewsService } from './employee-reviews.service';
import { CreateEmployeeReviewDto, UpdateEmployeeReviewDto } from '@time-tracker/dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantContext } from '../shared/tenant-context';
import type { Response } from 'express';

@Controller('employee-reviews')
@UseGuards(TenantGuard, AuthGuard('jwt'), RolesGuard)
export class EmployeeReviewsController {
    private readonly logger = new Logger(EmployeeReviewsController.name);
    constructor(private readonly employeeReviewsService: EmployeeReviewsService) { }

    @Post()
    create(@Body() createDto: CreateEmployeeReviewDto, @Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.employeeReviewsService.create(createDto, tenantId, req.user.id);
    }

    @Get()
    findAll(@Query('employeeId') employeeId?: string) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.employeeReviewsService.findAll(tenantId, employeeId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.employeeReviewsService.findOne(id, tenantId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateEmployeeReviewDto, @Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.employeeReviewsService.update(id, updateDto, tenantId, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.employeeReviewsService.remove(id, tenantId);
    }

    @Get(':id/pdf')
    async downloadPdf(@Param('id') id: string, @Res() res: Response) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');

        const pdfBuffer = await this.employeeReviewsService.generatePdf(id, tenantId);

        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', 'attachment; filename=employee-review.pdf');
        res.send(pdfBuffer);
    }
}
