import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsOptional() @IsEmail()
    email?: string;

    @IsOptional() @IsString()
    username?: string;

    @IsString() @MinLength(8)
    password!: string;
}

export class MeDto {
    id!: string;
    tenantId!: string;
    email!: string;
    username?: string;
    employeeId?: string;
    roles!: Array<{ role: string; scopeType: string; scopeId?: string | null }>;
}

export class AuthTokensDto {
    accessToken!: string;
    refreshToken!: string;
    user?: MeDto;
}

export class RefreshDto {
    @IsString()
    refreshToken!: string;
}


