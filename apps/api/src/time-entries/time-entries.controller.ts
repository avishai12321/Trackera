import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException, Request, Logger } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto, UpdateTimeEntryDto, DateRangeQueryDto } from '@time-tracker/dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantContext } from '../shared/tenant-context';
import { Role } from '../shared/enums';

@Controller('time-entries')
@UseGuards(TenantGuard, AuthGuard('jwt'), RolesGuard)
export class TimeEntriesController {
    private readonly logger = new Logger(TimeEntriesController.name);
    constructor(private readonly timeEntriesService: TimeEntriesService) { }

    @Post()
    create(@Body() createTimeEntryDto: CreateTimeEntryDto, @Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        this.logger.log(`POST /time-entries - tenantId from context: ${tenantId}`);
        this.logger.log(`x-tenant-id header: ${req.headers['x-tenant-id']}`);
        this.logger.log(`User: ${JSON.stringify({ id: req.user?.id, tenantId: req.user?.tenantId })}`);
        if (!tenantId) throw new Error('Tenant context missing');

        const user = req.user;
        const isEmployee = !user.roles.some((r: any) => r.role === Role.ADMIN || r.role === Role.OWNER || r.role === Role.MANAGER);

        // Validation: If regular employee, ensures they are creating for themselves
        if (isEmployee) {
            if (!user.employeeId) throw new BadRequestException('User is not linked to an Employee profile');
            if (createTimeEntryDto.employeeId !== user.employeeId) {
                throw new BadRequestException('You can only create time entries for yourself');
            }
        }

        // If Admin/Manager, they are creating ON BEHALF of employeeId (which must be valid, DB constraints will catch provided employeeId invalidity, but valid employeeId must exist in tenant).

        return this.timeEntriesService.create(createTimeEntryDto, tenantId, user.id);
    }

    @Get('suggestions')
    getSuggestions(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');

        if (!startDate || !endDate) throw new BadRequestException('startDate and endDate query parameters are required');

        return this.timeEntriesService.getSuggestions(tenantId, req.user.id, startDate, endDate);
    }

    @Get()
    findAll(@Query() query: any, @Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');

        const user = req.user;
        const isEmployee = !user.roles.some((r: any) => r.role === Role.ADMIN || r.role === Role.OWNER || r.role === Role.MANAGER);

        // If Employee, force filter by their ID
        const filterEmployeeId = isEmployee ? user.employeeId : query.employeeId;

        return this.timeEntriesService.findAll(tenantId, filterEmployeeId, query.projectId, query.from, query.to);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.timeEntriesService.findOne(id, tenantId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTimeEntryDto: UpdateTimeEntryDto, @Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.timeEntriesService.update(id, updateTimeEntryDto, req.user.id, tenantId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new Error('Tenant context missing');
        return this.timeEntriesService.remove(id, tenantId);
    }
}
