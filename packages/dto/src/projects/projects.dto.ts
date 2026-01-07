
import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ProjectStatus } from '../shared/enums';

export class CreateProjectDto {
    @IsString()
    name!: string;

    @IsOptional() @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateProjectDto {
    @IsOptional() @IsString()
    name?: string;

    @IsOptional() @IsString()
    code?: string;

    @IsOptional() @IsEnum(ProjectStatus)
    status?: ProjectStatus;
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
    status!: ProjectStatus;
}
