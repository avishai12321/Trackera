import { IsDateString, IsOptional, IsString } from 'class-validator';

export class DashboardSummaryQueryDto {
    @IsDateString()
    from!: string;

    @IsDateString()
    to!: string;

    @IsOptional() @IsString()
    projectId?: string;
}

export class DashboardSummaryDto {
    totalMinutes!: number;
    byProject!: Array<{ projectId: string; minutes: number }>;
    byEmployee!: Array<{ employeeId: string; minutes: number }>;
}
