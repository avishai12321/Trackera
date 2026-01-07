
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthGuard } from '@nestjs/passport';
import { TenantContext } from '../shared/tenant-context';

@Controller('dashboard')
@UseGuards(TenantGuard, AuthGuard('jwt'))
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    async getStats(@Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        return this.dashboardService.getStats(tenantId!, req.user.id);
    }
}
