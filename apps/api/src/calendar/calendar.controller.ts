import { Controller, Get, Post, Delete, Query, Res, UseGuards, Request, BadRequestException, Param } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AuthGuard } from '@nestjs/passport';
import { TenantContext } from '../shared/tenant-context';
import { Public } from '../common/decorators/public.decorator';

@Controller('calendar')
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Get('connections')
    @UseGuards(TenantGuard, AuthGuard('jwt'))
    async getConnections(@Request() req: any) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new BadRequestException('Tenant context missing');
        return this.calendarService.getConnections(tenantId, req.user.id);
    }

    @Delete('connections/:connectionId')
    @UseGuards(TenantGuard, AuthGuard('jwt'))
    async disconnectCalendar(@Request() req: any, @Param('connectionId') connectionId: string) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new BadRequestException('Tenant context missing');
        if (!connectionId) throw new BadRequestException('Connection ID is required');
        await this.calendarService.disconnectCalendar(tenantId, req.user.id, connectionId);
        return { message: 'Calendar disconnected successfully' };
    }

    @Post('sync/:connectionId')
    @UseGuards(TenantGuard, AuthGuard('jwt'))
    async syncConnection(@Request() req: any, @Param('connectionId') connectionId: string) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) throw new BadRequestException('Tenant context missing');
        if (!connectionId) throw new BadRequestException('Connection ID is required');
        await this.calendarService.enqueueSync(connectionId, tenantId);
        return { message: 'Sync initiated' };
    }

    @Delete('connections/:connectionId')
    @UseGuards(TenantGuard, AuthGuard('jwt'))
    async disconnect(@Request() req: any, @Param('connectionId') connectionId: string) {
        return this.calendarService.disconnect(connectionId, TenantContext.getTenantId()!, req.user.id);
    }

    @Get('connect/google')
    @UseGuards(TenantGuard, AuthGuard('jwt'))
    async connectGoogle(@Request() req: any) {
        // Return URL for frontend to redirect
        const url = await this.calendarService.getGoogleAuthUrl(TenantContext.getTenantId()!, req.user.id);
        return { url };
    }

    @Public()
    @Get('callback/google')
    async callbackGoogle(@Query('code') code: string, @Query('state') state: string, @Res() res: any) {
        // Exchange code for tokens
        // State contains tenantId/userId encoded in base64

        const response = await this.calendarService.handleGoogleCallback(code, state);
        if (response.connectionId && response.tenantId) {
            await this.calendarService.enqueueSync(response.connectionId, response.tenantId);
        }
        return res.redirect((process.env.FRONTEND_URL || 'http://localhost:3001') + '/calendar?status=success');
    }

    @Get('connect/microsoft')
    @UseGuards(TenantGuard, AuthGuard('jwt'))
    async connectMicrosoft(@Request() req: any) {
        const url = await this.calendarService.getMicrosoftAuthUrl(TenantContext.getTenantId()!, req.user.id);
        return { url };
    }

    @Public()
    @Get('callback/microsoft')
    async callbackMicrosoft(@Query('code') code: string, @Query('state') state: string, @Res() res: any) {
        const response = await this.calendarService.handleMicrosoftCallback(code, state);
        if (response.connectionId && response.tenantId) {
            await this.calendarService.enqueueSync(response.connectionId, response.tenantId);
        }
        return res.redirect((process.env.FRONTEND_URL || 'http://localhost:3001') + '/calendar?status=success');
    }

    @Public()
    @Post('webhook/google')
    async webhookGoogle(@Request() req: any, @Res() res: any) {
        // Headers provided by Google
        const channelId = req.headers['x-goog-channel-id'];
        const resourceState = req.headers['x-goog-resource-state'];
        // const channelToken = req.headers['x-goog-channel-token']; // Use to validate source

        if (!channelId || !resourceState) {
            throw new BadRequestException('Missing google headers');
        }

        if (resourceState === 'sync') {
            // Confirmation that channel is created
            return res.status(200).send('OK');
        }

        if (resourceState === 'exists') {
            // Find connection by channelId (connectionId IS the channelId)
            // Google requires channelId to be unique. Using connectionId matches.
            // Use enqueueSyncByConnectionId since we don't have tenantId from webhook
            await this.calendarService.enqueueSyncByConnectionId(channelId);
        }

        return res.status(200).send('OK');
    }
}
