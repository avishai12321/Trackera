import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../shared/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();

        // User roles is an array of objects based on Prisma relation: [{ role: 'OWNER', ... }]
        // We need to check if ANY of the user's roles match one of the required roles.

        if (!user || !user.roles) {
            console.log('RolesGuard: User or Roles missing', user);
            return false;
        }

        console.log('RolesGuard: Required', requiredRoles);
        console.log('RolesGuard: User Roles', user.roles);

        return requiredRoles.some((role) =>
            user.roles.some((userRole: any) => userRole.role?.toUpperCase() === role)
        );
    }
}
