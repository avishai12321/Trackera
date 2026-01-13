-- COMPLETE DATABASE SETUP FOR TRACKERA
-- Run this entire file in Supabase SQL Editor

-- Step 1: Create the company schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS company_test_company;

-- Step 2: Create enums in public schema (they're shared across schemas)
SET search_path TO public;

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'FINANCE_READONLY'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "RoleScopeType" AS ENUM ('TENANT', 'PROJECT', 'TEAM'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TimeEntrySource" AS ENUM ('MANUAL', 'CALENDAR_SUGGESTION', 'IMPORT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ERROR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ERROR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ReportType" AS ENUM ('TIME_ENTRIES_CSV', 'TIME_ENTRIES_PDF', 'PROJECT_SUMMARY'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ProjectBudgetType" AS ENUM ('FIXED', 'HOURLY_RATE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Step 3: Switch to company_test_company schema for tables
SET search_path TO company_test_company, public;

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    employee_code TEXT,
    email TEXT,
    status "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    position TEXT,
    department TEXT,
    level TEXT,
    salary DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    hourly_rate DECIMAL(10,2),
    manager_id UUID,
    monthly_capacity DECIMAL(10,2) DEFAULT 160.00,
    years_of_experience DECIMAL(4,1),
    hire_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employees_pkey PRIMARY KEY (id)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    status "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    client_id UUID,
    manager_id UUID,
    budget_type "ProjectBudgetType" DEFAULT 'FIXED',
    total_budget DECIMAL(10,2),
    hourly_rate DECIMAL(10,2),
    estimated_hours DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT projects_pkey PRIMARY KEY (id)
);

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

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    project_id UUID NOT NULL,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    minutes INTEGER NOT NULL,
    hours DECIMAL(10,2),
    description TEXT,
    source "TimeEntrySource" NOT NULL DEFAULT 'MANUAL',
    billable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_entries_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS employees_tenant_id_idx ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS employees_manager_id_idx ON employees(manager_id);
CREATE INDEX IF NOT EXISTS employees_status_idx ON employees(status);

CREATE INDEX IF NOT EXISTS projects_tenant_id_idx ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_manager_id_idx ON projects(manager_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);

CREATE INDEX IF NOT EXISTS clients_tenant_id_idx ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status);

CREATE INDEX IF NOT EXISTS time_allocations_tenant_id_idx ON time_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS time_allocations_project_id_idx ON time_allocations(project_id);
CREATE INDEX IF NOT EXISTS time_allocations_employee_id_idx ON time_allocations(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS time_allocations_unique_key ON time_allocations(tenant_id, project_id, employee_id, year, month);

CREATE INDEX IF NOT EXISTS project_budgets_tenant_id_idx ON project_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS project_budgets_project_id_idx ON project_budgets(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS project_budgets_unique_key ON project_budgets(tenant_id, project_id, year, month);

CREATE INDEX IF NOT EXISTS time_entries_tenant_id_idx ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS time_entries_employee_id_idx ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS time_entries_project_id_idx ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS time_entries_date_idx ON time_entries(tenant_id, date);

-- Add foreign key constraints
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_manager_id_fkey;
ALTER TABLE employees ADD CONSTRAINT employees_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_manager_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE time_allocations DROP CONSTRAINT IF EXISTS time_allocations_project_id_fkey;
ALTER TABLE time_allocations ADD CONSTRAINT time_allocations_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE time_allocations DROP CONSTRAINT IF EXISTS time_allocations_employee_id_fkey;
ALTER TABLE time_allocations ADD CONSTRAINT time_allocations_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE project_budgets DROP CONSTRAINT IF EXISTS project_budgets_project_id_fkey;
ALTER TABLE project_budgets ADD CONSTRAINT project_budgets_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_project_id_fkey;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable Row Level Security (but allow all access for now - we'll configure tenant isolation later)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies (allow all for development - configure tenant isolation in production)
DROP POLICY IF EXISTS "Allow all for employees" ON employees;
CREATE POLICY "Allow all for employees" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for projects" ON projects;
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for clients" ON clients;
CREATE POLICY "Allow all for clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for time_allocations" ON time_allocations;
CREATE POLICY "Allow all for time_allocations" ON time_allocations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for project_budgets" ON project_budgets;
CREATE POLICY "Allow all for project_budgets" ON project_budgets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for time_entries" ON time_entries;
CREATE POLICY "Allow all for time_entries" ON time_entries FOR ALL USING (true) WITH CHECK (true);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_allocations_updated_at ON time_allocations;
CREATE TRIGGER update_time_allocations_updated_at BEFORE UPDATE ON time_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON project_budgets;
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
