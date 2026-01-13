import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTimeAllocationDto {
  @IsString()
  projectId!: string;

  @IsString()
  employeeId!: string;

  @IsNumber()
  year!: number;

  @IsNumber()
  month!: number;

  @IsNumber()
  allocatedHours!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTimeAllocationDto {
  @IsOptional()
  @IsNumber()
  allocatedHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TimeAllocationItemDto {
  projectId!: string;
  employeeId!: string;
  year!: number;
  month!: number;
  allocatedHours!: number;
}

export class BulkUpdateTimeAllocationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeAllocationItemDto)
  allocations!: TimeAllocationItemDto[];
}

export class ProjectInfoDto {
  id!: string;
  name!: string;
  code?: string | null;
  client?: { id: string; name: string } | null;
  budgetType!: string;
  totalBudget?: number | null;
  hourlyRate?: number | null;
  totalLoggedHours!: number;
  startDate?: Date | null;
  endDate?: Date | null;
  status!: string;
}

export class EmployeeInfoDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  monthlyCapacity!: number;
  hourlyRate?: number | null;
}

export class MonthInfoDto {
  year!: number;
  month!: number;
}

export class PlanningGridDto {
  projects!: ProjectInfoDto[];
  employees!: EmployeeInfoDto[];
  months!: MonthInfoDto[];
  allocations!: Record<string, number>; // key: "projectId_employeeId_year_month"
  loggedHours!: Record<string, number>; // key: "projectId"
  monthlyBudgets!: Record<string, number>; // key: "projectId_year_month"
}

export class TimeAllocationDto {
  id!: string;
  tenantId!: string;
  projectId!: string;
  employeeId!: string;
  month!: number;
  year!: number;
  allocatedHours!: number;
  notes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
