import { IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CalendarEventsQueryDto {
    @IsDateString()
    from!: string;

    @IsDateString()
    to!: string;
}

export class CalendarEventDto {
    id!: string;
    provider!: 'GOOGLE' | 'MICROSOFT';
    title!: string;
    startAt!: string;
    endAt!: string;
    isAllDay!: boolean;
    isRecurring!: boolean;
}

export class CalendarSuggestionDto {
    calendarEventId!: string;
    title!: string;
    startAt!: string;
    endAt!: string;
    suggestedMinutes!: number;
    alreadyApplied!: boolean;
}

export class SuggestionsGenerateQueryDto {
    @IsDateString()
    from!: string;

    @IsDateString()
    to!: string;
}

export class ApplySuggestionItemDto {
    @IsString()
    calendarEventId!: string;

    @IsString()
    projectId!: string;

    @IsOptional() @IsString()
    employeeId?: string;

    @IsString()
    date!: string;

    @IsOptional()
    minutes?: number;
}

export class SuggestionsApplyDto {
    @ValidateNested({ each: true })
    @Type(() => ApplySuggestionItemDto)
    items!: ApplySuggestionItemDto[];
}
