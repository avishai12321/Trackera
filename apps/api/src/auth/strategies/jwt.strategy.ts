import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor() {
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: any) {
        // Return user object which is attached to req.user
        return {
            id: payload.sub,
            username: payload.username,
            tenantId: payload.tenantId,
            roles: payload.roles,
            employeeId: payload.employeeId
        };
    }
}
