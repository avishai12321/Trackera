import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class DateRangeQueryDto {
    @IsDateString()
    from!: string; // YYYY-MM-DD

    @IsDateString()
    to!: string; // YYYY-MM-DD
}

export class PaginationQueryDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1)
    page?: number = 1;

    @IsOptional() @Type(() => Number) @IsInt() @Min(1)
    pageSize?: number = 50;
}
