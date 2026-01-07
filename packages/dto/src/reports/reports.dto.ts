import { IsEnum, IsObject } from 'class-validator';
import { JobStatus, ReportType } from '../shared/enums';

export class CreateReportDto {
    @IsEnum(ReportType)
    type!: ReportType;

    @IsObject()
    params!: {
        from: string;
        to: string;
        employeeId?: string;
        projectId?: string;
    };
}

export class ReportJobDto {
    id!: string;
    tenantId!: string;
    type!: ReportType;
    status!: JobStatus;
    fileKey?: string | null;
    error?: string | null;
    createdAt!: string;
    updatedAt!: string;
}
