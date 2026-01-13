import { IsEmail, IsEnum, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
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

    @IsOptional() @IsString()
    position?: string;

    @IsOptional() @IsString()
    department?: string;

    @IsOptional() @IsString()
    level?: string;

    @IsOptional() @IsNumber()
    salary?: number;

    @IsOptional() @IsString()
    currency?: string;

    @IsOptional() @IsNumber()
    hourlyRate?: number;

    @IsOptional() @IsString()
    managerId?: string;

    @IsOptional() @IsNumber()
    monthlyCapacity?: number;

    @IsOptional() @IsNumber()
    yearsOfExperience?: number;

    @IsOptional() @IsDateString()
    hireDate?: string;
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

    @IsOptional() @IsString()
    position?: string;

    @IsOptional() @IsString()
    department?: string;

    @IsOptional() @IsString()
    level?: string;

    @IsOptional() @IsNumber()
    salary?: number;

    @IsOptional() @IsString()
    currency?: string;

    @IsOptional() @IsNumber()
    hourlyRate?: number;

    @IsOptional() @IsString()
    managerId?: string;

    @IsOptional() @IsNumber()
    monthlyCapacity?: number;

    @IsOptional() @IsNumber()
    yearsOfExperience?: number;

    @IsOptional() @IsDateString()
    hireDate?: string;
}

export class EmployeeDto {
    id!: string;
    tenantId!: string;
    userId?: string | null;
    firstName!: string;
    lastName!: string;
    email?: string | null;
    status!: EmployeeStatus;
    employeeCode?: string | null;
    position?: string | null;
    department?: string | null;
    level?: string | null;
    salary?: number | null;
    currency?: string | null;
    hourlyRate?: number | null;
    managerId?: string | null;
    manager?: { id: string; firstName: string; lastName: string } | null;
    monthlyCapacity?: number;
    yearsOfExperience?: number | null;
    hireDate?: Date | null;
    createdAt!: Date;
    updatedAt!: Date;
}

export class AssignProjectDto {
    @IsString()
    projectId!: string;

    @IsOptional() @IsString()
    role?: string;
}
