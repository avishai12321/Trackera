import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '@time-tracker/dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        // For MVP, we assume tenantId is either derived from domain or passed in body?
        // User spec says: "POST /auth/login (public)"
        // RBAC section says: "Login requires email/username + password".
        // Since email + tenantId is unique, but email is not unique globally, we need to know WHICH tenant.
        // However, usually SaaS login allows email to find user.
        // If we have duplicate emails in different tenants, we can't easily distinguish without extra info.
        // But for MVP, let's assume we pass tenantId via header "x-tenant-id" or we try to find ONE user?
        // Or we assume email is unique globally for simplicity?
        // Spec says: "users: unique (tenant_id, email)".

        // We will assume for now tenantId is passed in header (handled by Middleware context? NO, middleware runs before auth).

        // Actually, middleware sets context. But login is public.
        // Let's rely on TenantContext being set if header is present.

        // Better: Allow login to take tenantId in body or header.
        // DTO from spec: LoginDto { email, username, password }. No tenantId field.
        // So it must be header!

        const tenantId = (process.env.DEFAULT_TENANT_ID) || 'default'; // fallback or error?
        // In real multi-tenant, identifying tenant is step 1 (subdomain or 'slug' in URL).
        // The user spec implies "Every request after auth must have a resolved tenant_id". 
        // Login IS auth.

        // We will try to rely on TenantContext (populated from header).

        // BUT TenantContext.getTenantId() works inside the middleware callback.
        // If logic is here, we are inside that callback? Yes, Controller runs inside middleware.

        const { TenantContext } = require('../shared/tenant-context'); // circular dep avoidance? No common/ is safe.
        // Import properly
        const ctxTenant = TenantContext.getTenantId();

        if (!ctxTenant) {
            throw new UnauthorizedException('Tenant ID header (x-tenant-id) required for login');
        }

        const user = await this.authService.validateUser(loginDto.email!, loginDto.password, ctxTenant);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user); // returns { accessToken, refreshToken }
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
