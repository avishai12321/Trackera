import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { TenantContext } from '../../shared/tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    use(req: any, res: Response, next: NextFunction) {
        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
        // req.user might not be populated yet if AuthGuard runs later.
        // Usually, for public endpoints, we might pick tenant from subdomain or header.
        // For authenticated, we rely on the token. 

        // However, since Middleware runs BEFORE Guards, req.user is usually undefined unless we decode JWT manually here.

        // STRATEGY: 
        // 1. If 'x-tenant-id' header exists, use it.
        // 2. If not, proceed without context (Supabase service handles tenant filtering).

        if (tenantId) {
            TenantContext.run(tenantId as string, () => {
                next();
            });
        } else {
            next();
        }
    }
}
