-- Migration: Add Clients, Time Allocations, Project Budgets, and Enhanced Employee/Project fields
-- RUN THIS IN SUPABASE SQL EDITOR (not via Prisma)

-- First, let's check what schema the tables are in
-- Run this query first to find out:
-- SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'employees';

-- OPTION 1: If tables are in 'public' schema, run this:
-- SET search_path TO public;

-- OPTION 2: If tables are in 'company_test_company' schema, run this:
SET search_path TO company_test_company, public;

-- Add new enums (these go in public schema)
SET search_path TO public;
DO $$ BEGIN
    CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProjectBudgetType" AS ENUM ('FIXED', 'HOURLY_RATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Switch back to your working schema
-- CHANGE THIS: Set to 'public' or 'company_test_company' based on where your employees table is
SET search_path TO company_test_company, public;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    company_name TEXT,
    tax_id TEXT,
    registration_number TEXT,
    website TEXT,
    billing_email TEXT,
    billing_address TEXT,
    payment_terms INTEGER,
    currency TEXT DEFAULT 'USD',
    default_hourly_rate DECIMAL(10,2),
    contract_start_date DATE,
    contract_end_date DATE,
    contract_value DECIMAL(10,2),
    notes TEXT,
    status "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- Create time_allocations table
CREATE TABLE IF NOT EXISTS time_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    allocated_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_allocations_pkey PRIMARY KEY (id)
);

-- Create project_budgets table
CREATE TABLE IF NOT EXISTS project_budgets (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    budget_amount DECIMAL(10,2),
    budget_hours DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_budgets_pkey PRIMARY KEY (id)
);

-- Add new columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_capacity DECIMAL(10,2) DEFAULT 160.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS years_of_experience DECIMAL(4,1);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Add new columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_type "ProjectBudgetType" DEFAULT 'FIXED';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_budget DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS clients_tenant_id_idx ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status);

CREATE INDEX IF NOT EXISTS time_allocations_tenant_id_idx ON time_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS time_allocations_project_id_idx ON time_allocations(project_id);
CREATE INDEX IF NOT EXISTS time_allocations_employee_id_idx ON time_allocations(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS time_allocations_unique_key
    ON time_allocations(tenant_id, project_id, employee_id, year, month);

CREATE INDEX IF NOT EXISTS project_budgets_tenant_id_idx ON project_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS project_budgets_project_id_idx ON project_budgets(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS project_budgets_unique_key
    ON project_budgets(tenant_id, project_id, year, month);

CREATE INDEX IF NOT EXISTS employees_manager_id_idx ON employees(manager_id);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_manager_id_idx ON projects(manager_id);

-- Add foreign key constraints
ALTER TABLE time_allocations DROP CONSTRAINT IF EXISTS time_allocations_project_id_fkey;
ALTER TABLE time_allocations ADD CONSTRAINT time_allocations_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE time_allocations DROP CONSTRAINT IF EXISTS time_allocations_employee_id_fkey;
ALTER TABLE time_allocations ADD CONSTRAINT time_allocations_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE project_budgets DROP CONSTRAINT IF EXISTS project_budgets_project_id_fkey;
ALTER TABLE project_budgets ADD CONSTRAINT project_budgets_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_manager_id_fkey;
ALTER TABLE employees ADD CONSTRAINT employees_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_manager_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients table
DROP POLICY IF EXISTS "Users can view clients in their tenant" ON clients;
CREATE POLICY "Users can view clients in their tenant"
    ON clients FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can insert clients in their tenant" ON clients;
CREATE POLICY "Users can insert clients in their tenant"
    ON clients FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can update clients in their tenant" ON clients;
CREATE POLICY "Users can update clients in their tenant"
    ON clients FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can delete clients in their tenant" ON clients;
CREATE POLICY "Users can delete clients in their tenant"
    ON clients FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Create RLS policies for time_allocations table
DROP POLICY IF EXISTS "Users can view time allocations in their tenant" ON time_allocations;
CREATE POLICY "Users can view time allocations in their tenant"
    ON time_allocations FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can insert time allocations in their tenant" ON time_allocations;
CREATE POLICY "Users can insert time allocations in their tenant"
    ON time_allocations FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can update time allocations in their tenant" ON time_allocations;
CREATE POLICY "Users can update time allocations in their tenant"
    ON time_allocations FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can delete time allocations in their tenant" ON time_allocations;
CREATE POLICY "Users can delete time allocations in their tenant"
    ON time_allocations FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Create RLS policies for project_budgets table
DROP POLICY IF EXISTS "Users can view project budgets in their tenant" ON project_budgets;
CREATE POLICY "Users can view project budgets in their tenant"
    ON project_budgets FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can insert project budgets in their tenant" ON project_budgets;
CREATE POLICY "Users can insert project budgets in their tenant"
    ON project_budgets FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can update project budgets in their tenant" ON project_budgets;
CREATE POLICY "Users can update project budgets in their tenant"
    ON project_budgets FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS "Users can delete project budgets in their tenant" ON project_budgets;
CREATE POLICY "Users can delete project budgets in their tenant"
    ON project_budgets FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_allocations_updated_at ON time_allocations;
CREATE TRIGGER update_time_allocations_updated_at BEFORE UPDATE ON time_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON project_budgets;
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
