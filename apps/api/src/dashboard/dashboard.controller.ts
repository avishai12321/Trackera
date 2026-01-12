
import { Controller, Get, Query, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthGuard } from '@nestjs/passport';
import { TenantContext } from '../shared/tenant-context';

@Controller('dashboard')
@UseGuards(TenantGuard, AuthGuard('jwt'))
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    /**
     * PAGE 1: Company Overview Dashboard
     * GET /dashboard/company-overview?startDate=2022-01-01&endDate=2022-12-31
     */
    @Get('company-overview')
    async getCompanyOverview(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        if (!startDate || !endDate) {
            throw new BadRequestException('startDate and endDate query parameters are required');
        }

        const tenantId = TenantContext.getTenantId();
        if (!tenantId) {
            throw new BadRequestException('Tenant ID not found');
        }

        return this.dashboardService.getCompanyOverview(tenantId, startDate, endDate);
    }

    /**
     * PAGE 2: Project View Dashboard
     * GET /dashboard/project/:projectId?startDate=2022-01-01&endDate=2022-12-31
     */
    @Get('project/:projectId')
    async getProjectView(
        @Param('projectId') projectId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        if (!startDate || !endDate) {
            throw new BadRequestException('startDate and endDate query parameters are required');
        }

        const tenantId = TenantContext.getTenantId();
        if (!tenantId) {
            throw new BadRequestException('Tenant ID not found');
        }

        return this.dashboardService.getProjectView(tenantId, projectId, startDate, endDate);
    }

    /**
     * PAGE 3: Employee Overview Dashboard
     * GET /dashboard/employee-overview?startDate=2022-01-01&endDate=2022-12-31
     */
    @Get('employee-overview')
    async getEmployeeOverview(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        if (!startDate || !endDate) {
            throw new BadRequestException('startDate and endDate query parameters are required');
        }

        const tenantId = TenantContext.getTenantId();
        if (!tenantId) {
            throw new BadRequestException('Tenant ID not found');
        }

        return this.dashboardService.getEmployeeOverview(tenantId, startDate, endDate);
    }

    /**
     * PAGE 4: Employee Deep Dive Dashboard
     * GET /dashboard/employee/:employeeId?startDate=2022-01-01&endDate=2022-12-31
     */
    @Get('employee/:employeeId')
    async getEmployeeDeepDive(
        @Param('employeeId') employeeId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        if (!startDate || !endDate) {
            throw new BadRequestException('startDate and endDate query parameters are required');
        }

        const tenantId = TenantContext.getTenantId();
        if (!tenantId) {
            throw new BadRequestException('Tenant ID not found');
        }

        return this.dashboardService.getEmployeeDeepDive(tenantId, employeeId, startDate, endDate);
    }

    /**
     * LEGACY: Keep existing stats endpoint for backward compatibility
     * GET /dashboard/stats
     */
    @Get('stats')
    async getStats(@Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        return this.dashboardService.getStats(tenantId!, req.user.id);
    }
}
