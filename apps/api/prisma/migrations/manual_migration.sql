-- Migration: Add Clients, Time Allocations, Project Budgets, and Enhanced Employee/Project fields
-- Run this SQL in your Supabase SQL Editor

-- Add new enums
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "ProjectBudgetType" AS ENUM ('FIXED', 'HOURLY_RATE');

-- Create Client table
CREATE TABLE IF NOT EXISTS "Client" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "company_name" TEXT,
    "tax_id" TEXT,
    "registration_number" TEXT,
    "website" TEXT,
    "billing_email" TEXT,
    "billing_address" TEXT,
    "payment_terms" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "default_hourly_rate" DECIMAL(10,2),
    "contract_start_date" DATE,
    "contract_end_date" DATE,
    "contract_value" DECIMAL(10,2),
    "notes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- Create TimeAllocation table
CREATE TABLE IF NOT EXISTS "TimeAllocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "allocated_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeAllocation_pkey" PRIMARY KEY ("id")
);

-- Create ProjectBudget table
CREATE TABLE IF NOT EXISTS "ProjectBudget" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "budget_amount" DECIMAL(10,2),
    "budget_hours" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id")
);

-- Add new columns to Employee table
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "level" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "salary" DECIMAL(10,2);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hourly_rate" DECIMAL(10,2);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "manager_id" UUID;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "monthly_capacity" DECIMAL(10,2) DEFAULT 160.00;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "years_of_experience" DECIMAL(4,1);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hire_date" DATE;

-- Add new columns to Project table
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "client_id" UUID;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "manager_id" UUID;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "budget_type" "ProjectBudgetType" DEFAULT 'FIXED';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "total_budget" DECIMAL(10,2);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "hourly_rate" DECIMAL(10,2);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "estimated_hours" DECIMAL(10,2);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "start_date" DATE;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "end_date" DATE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Client_tenant_id_idx" ON "Client"("tenant_id");
CREATE INDEX IF NOT EXISTS "Client_status_idx" ON "Client"("status");

CREATE INDEX IF NOT EXISTS "TimeAllocation_tenant_id_idx" ON "TimeAllocation"("tenant_id");
CREATE INDEX IF NOT EXISTS "TimeAllocation_project_id_idx" ON "TimeAllocation"("project_id");
CREATE INDEX IF NOT EXISTS "TimeAllocation_employee_id_idx" ON "TimeAllocation"("employee_id");
CREATE UNIQUE INDEX IF NOT EXISTS "TimeAllocation_tenant_id_project_id_employee_id_year_month_key"
    ON "TimeAllocation"("tenant_id", "project_id", "employee_id", "year", "month");

CREATE INDEX IF NOT EXISTS "ProjectBudget_tenant_id_idx" ON "ProjectBudget"("tenant_id");
CREATE INDEX IF NOT EXISTS "ProjectBudget_project_id_idx" ON "ProjectBudget"("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectBudget_tenant_id_project_id_year_month_key"
    ON "ProjectBudget"("tenant_id", "project_id", "year", "month");

CREATE INDEX IF NOT EXISTS "Employee_manager_id_idx" ON "Employee"("manager_id");

CREATE INDEX IF NOT EXISTS "Project_client_id_idx" ON "Project"("client_id");
CREATE INDEX IF NOT EXISTS "Project_manager_id_idx" ON "Project"("manager_id");

-- Add foreign key constraints
ALTER TABLE "TimeAllocation" ADD CONSTRAINT "TimeAllocation_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimeAllocation" ADD CONSTRAINT "TimeAllocation_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_manager_id_fkey"
    FOREIGN KEY ("manager_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_manager_id_fkey"
    FOREIGN KEY ("manager_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectBudget" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Client table
CREATE POLICY "Users can view clients in their tenant"
    ON "Client" FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can insert clients in their tenant"
    ON "Client" FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can update clients in their tenant"
    ON "Client" FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can delete clients in their tenant"
    ON "Client" FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Create RLS policies for TimeAllocation table
CREATE POLICY "Users can view time allocations in their tenant"
    ON "TimeAllocation" FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can insert time allocations in their tenant"
    ON "TimeAllocation" FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can update time allocations in their tenant"
    ON "TimeAllocation" FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can delete time allocations in their tenant"
    ON "TimeAllocation" FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Create RLS policies for ProjectBudget table
CREATE POLICY "Users can view project budgets in their tenant"
    ON "ProjectBudget" FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can insert project budgets in their tenant"
    ON "ProjectBudget" FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can update project budgets in their tenant"
    ON "ProjectBudget" FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Users can delete project budgets in their tenant"
    ON "ProjectBudget" FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_updated_at BEFORE UPDATE ON "Client"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_allocation_updated_at BEFORE UPDATE ON "TimeAllocation"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_budget_updated_at BEFORE UPDATE ON "ProjectBudget"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
