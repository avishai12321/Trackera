import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateProjectBudgetDto {
  @IsString()
  projectId!: string;

  @IsNumber()
  year!: number;

  @IsNumber()
  month!: number;

  @IsOptional()
  @IsNumber()
  budgetAmount?: number;

  @IsOptional()
  @IsNumber()
  budgetHours?: number;
}

export class UpdateProjectBudgetDto {
  @IsOptional()
  @IsNumber()
  budgetAmount?: number;

  @IsOptional()
  @IsNumber()
  budgetHours?: number;
}

export class ProjectBudgetDto {
  id!: string;
  tenantId!: string;
  projectId!: string;
  month!: number;
  year!: number;
  budgetAmount?: number | null;
  budgetHours?: number | null;
  createdAt!: Date;
  updatedAt!: Date;
}
