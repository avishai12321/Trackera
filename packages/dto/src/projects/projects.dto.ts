
import { IsEnum, IsOptional, IsString, IsNotEmpty, IsNumber, IsDateString } from 'class-validator';
import { ProjectStatus, ProjectBudgetType } from '../shared/enums';

export class CreateProjectDto {
    @IsString()
    name!: string;

    @IsOptional() @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsOptional() @IsString()
    clientId?: string;

    @IsOptional() @IsString()
    managerId?: string;

    @IsOptional() @IsEnum(ProjectBudgetType)
    budgetType?: ProjectBudgetType;

    @IsOptional() @IsNumber()
    totalBudget?: number;

    @IsOptional() @IsNumber()
    hourlyRate?: number;

    @IsOptional() @IsNumber()
    estimatedHours?: number;

    @IsOptional() @IsString()
    currency?: string;

    @IsOptional() @IsDateString()
    startDate?: string;

    @IsOptional() @IsDateString()
    endDate?: string;
}

export class UpdateProjectDto {
    @IsOptional() @IsString()
    name?: string;

    @IsOptional() @IsString()
    code?: string;

    @IsOptional() @IsString()
    description?: string;

    @IsOptional() @IsEnum(ProjectStatus)
    status?: ProjectStatus;

    @IsOptional() @IsString()
    clientId?: string;

    @IsOptional() @IsString()
    managerId?: string;

    @IsOptional() @IsEnum(ProjectBudgetType)
    budgetType?: ProjectBudgetType;

    @IsOptional() @IsNumber()
    totalBudget?: number;

    @IsOptional() @IsNumber()
    hourlyRate?: number;

    @IsOptional() @IsNumber()
    estimatedHours?: number;

    @IsOptional() @IsString()
    currency?: string;

    @IsOptional() @IsDateString()
    startDate?: string;

    @IsOptional() @IsDateString()
    endDate?: string;
}

export class AddProjectMemberDto {
    @IsString()
    employeeId!: string;

    @IsOptional() @IsString()
    role?: 'MEMBER' | 'PROJECT_MANAGER';
}

export class ProjectDto {
    id!: string;
    tenantId!: string;
    name!: string;
    code?: string | null;
    description?: string | null;
    status!: ProjectStatus;
    startDate?: Date | null;
    endDate?: Date | null;
    clientId?: string | null;
    client?: { id: string; name: string } | null;
    managerId?: string | null;
    manager?: { id: string; firstName: string; lastName: string } | null;
    budgetType!: ProjectBudgetType;
    totalBudget?: number | null;
    hourlyRate?: number | null;
    estimatedHours?: number | null;
    currency?: string | null;
    createdAt!: Date;
    updatedAt!: Date;
}
