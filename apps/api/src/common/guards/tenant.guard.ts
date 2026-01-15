import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantContext } from '../../shared/tenant-context';

@Injectable()
export class TenantGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const headerTenantId = request.headers['x-tenant-id'];

        // If not authenticated (public), we rely on header verification done elsewhere or just context.
        // If authenticated, we MUST verify header matches token.
        if (user && user.tenantId) {
            if (headerTenantId && headerTenantId !== user.tenantId) {
                throw new ForbiddenException('Tenant ID mismatch between Token and Header');
            }
            // Optional: Enforce header presence? 
            // If header missing, Context is undefined. 
            // SupabaseService uses TenantContext for filtering.
            // So we effectively require header even for authenticated requests. 

            // DECISION: Require x-tenant-id header for ALL requests for consistency in MVP.
            if (!headerTenantId) {
                throw new ForbiddenException('x-tenant-id header is required');
            }
        }

        return true;
    }
}
