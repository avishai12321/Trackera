
import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { Role, RoleScopeType, UserStatus } from '../shared/enums';

export class CreateUserDto {
    @IsEmail()
    email!: string;

    @IsOptional() @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsString() @MinLength(8)
    password!: string;

    roles?: Array<{ role: Role; scopeType?: RoleScopeType; scopeId?: string | null }>;
}

export class UpdateUserDto {
    @IsOptional() @IsEmail()
    email?: string;

    @IsOptional() @IsString()
    username?: string;

    @IsOptional() @IsEnum(UserStatus)
    status?: UserStatus;
}

export class UserDto {
    id!: string;
    tenantId!: string;
    email!: string;
    username?: string;
    status!: UserStatus;
    createdAt!: string;
    updatedAt!: string;
}
