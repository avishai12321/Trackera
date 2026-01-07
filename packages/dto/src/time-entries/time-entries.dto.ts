import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, IsBoolean } from 'class-validator';
import { TimeEntrySource } from '../shared/enums';

export class CreateTimeEntryDto {
    @IsString()
    employeeId!: string;

    @IsString()
    projectId!: string;

    @IsOptional() @IsDateString()
    date?: string;

    @IsDateString()
    startTime!: string;

    @IsOptional() @IsString()
    endTime?: string;

    @Type(() => Number) @IsInt() @Min(1)
    durationMinutes!: number;

    @IsOptional() @IsBoolean()
    billable?: boolean = true;

    @IsOptional() @IsString()
    description?: string;

    @IsOptional() @IsEnum(TimeEntrySource)
    source?: TimeEntrySource = TimeEntrySource.MANUAL;

    @IsOptional() @IsString()
    calendarEventId?: string;
}

export class UpdateTimeEntryDto {
    @IsOptional() @IsString()
    projectId?: string;

    @IsOptional() @IsDateString()
    date?: string;

    @IsOptional() @IsString()
    startTime?: string;

    @IsOptional() @IsString()
    endTime?: string;

    @IsOptional() @Type(() => Number) @IsInt() @Min(1)
    durationMinutes?: number;

    @IsOptional() @IsString()
    description?: string;
}

export class TimeEntriesQueryDto {
    @IsDateString()
    from!: string;

    @IsDateString()
    to!: string;

    @IsOptional() @IsString()
    employeeId?: string;

    @IsOptional() @IsString()
    projectId?: string;
}

export class TimeEntryDto {
    id!: string;
    tenantId!: string;
    employeeId!: string;
    projectId!: string;
    date!: string;
    startTime?: string | null;
    endTime?: string | null;
    minutes!: number;
    description?: string | null;
    source!: TimeEntrySource;
    calendarEventId?: string | null;
    createdAt!: string;
    updatedAt!: string;
}
