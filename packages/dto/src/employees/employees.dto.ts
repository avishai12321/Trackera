import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { EmployeeStatus } from '../shared/enums';

export class CreateEmployeeDto {
    @IsString()
    firstName!: string;

    @IsString()
    lastName!: string;

    @IsOptional() @IsEmail()
    email?: string;

    @IsOptional() @IsString()
    employeeCode?: string;

    @IsOptional() @IsString()
    userId?: string;
}

export class UpdateEmployeeDto {
    @IsOptional() @IsString()
    firstName?: string;

    @IsOptional() @IsString()
    lastName?: string;

    @IsOptional() @IsEmail()
    email?: string;

    @IsOptional() @IsEnum(EmployeeStatus)
    status?: EmployeeStatus;
}

export class EmployeeDto {
    id!: string;
    tenantId!: string;
    userId?: string | null;
    firstName!: string;
    lastName!: string;
    email?: string | null;
    status!: EmployeeStatus;
}
