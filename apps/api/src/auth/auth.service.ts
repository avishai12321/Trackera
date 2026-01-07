import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, AuthTokensDto } from '@time-tracker/dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string, tenantId: string): Promise<any> {
        const user: any = await this.usersService.findByEmail(email, tenantId);
        if (user && await bcrypt.compare(pass, user.passwordHash)) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any): Promise<AuthTokensDto> {
        const payload = {
            username: user.username,
            sub: user.id,
            tenantId: user.tenantId,
            roles: user.roles,
            employeeId: user.employee?.id
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload as any, {
                secret: process.env.JWT_ACCESS_SECRET!,
                expiresIn: `${process.env.JWT_ACCESS_TTL_SECONDS || 900}s` as any
            }),
            this.jwtService.signAsync(payload as any, {
                secret: process.env.JWT_REFRESH_SECRET!,
                expiresIn: `${process.env.JWT_REFRESH_TTL_SECONDS || 1209600}s` as any
            }),
        ]);

        // TODO: Store refresh token hash in DB

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tenantId: user.tenantId,
                roles: user.roles,
                employeeId: user.employee?.id
            }
        };
    }
}
