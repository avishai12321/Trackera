-- COMPLETE DATABASE SETUP FOR TRACKERA
-- Run this entire file in Supabase SQL Editor

-- Step 1: Create the company schema if it doesn't exist
DROP SCHEMA IF EXISTS company_test_company CASCADE;
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
    first_report_date DATE,
    last_report_date DATE,
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
-- Seed data for schema company_test_company
SET search_path TO company_test_company, public;

-- Employees
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '3b9d3719-c848-4875-9b8a-7801372f5bb0', '11111111-1111-1111-1111-111111111111', 'Employee0', 'User0', 'employee0@test.com', 'ACTIVE', 'Developer', 75753, 51, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '57b652c5-41f5-4841-a786-8179441a9e6a', '11111111-1111-1111-1111-111111111111', 'Employee1', 'User1', 'employee1@test.com', 'ACTIVE', 'Developer', 62898, 63, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '276f1edc-3a46-4801-94bf-b53bcf8df73c', '11111111-1111-1111-1111-111111111111', 'Employee2', 'User2', 'employee2@test.com', 'ACTIVE', 'QA', 101698, 99, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '2d6fae48-1173-4c6f-817b-de38806ac2db', '11111111-1111-1111-1111-111111111111', 'Employee3', 'User3', 'employee3@test.com', 'ACTIVE', 'QA', 66117, 64, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', '11111111-1111-1111-1111-111111111111', 'Employee4', 'User4', 'employee4@test.com', 'ACTIVE', 'QA', 61853, 37, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', '11111111-1111-1111-1111-111111111111', 'Employee5', 'User5', 'employee5@test.com', 'ACTIVE', 'DevOps', 80333, 90, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '6d40f245-854b-458b-b7ca-cb34536b4e41', '11111111-1111-1111-1111-111111111111', 'Employee6', 'User6', 'employee6@test.com', 'ACTIVE', 'Designer', 105589, 49, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '86f6d4ae-6ea6-4e43-89b2-d3c9c8cba191', '11111111-1111-1111-1111-111111111111', 'Employee7', 'User7', 'employee7@test.com', 'ACTIVE', 'Product Manager', 54082, 30, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            'ac72ce11-9f56-45b7-b83d-b99aa08fd1e9', '11111111-1111-1111-1111-111111111111', 'Employee8', 'User8', 'employee8@test.com', 'ACTIVE', 'DevOps', 62902, 82, 160
        );
INSERT INTO "company_test_company".employees (id, tenant_id, first_name, last_name, email, status, position, salary, hourly_rate, monthly_capacity) VALUES (
            '54836cbf-9f9a-42ef-9938-d4225a8f3d1a', '11111111-1111-1111-1111-111111111111', 'Employee9', 'User9', 'employee9@test.com', 'ACTIVE', 'Developer', 108825, 91, 160
        );

-- Clients
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '994bdcc3-ca90-46bf-8314-bd6c29a94de6', '11111111-1111-1111-1111-111111111111', 'Client Company 0', 'contact@client0.com', 'ACTIVE', 'USD', 188
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'd0414985-69b7-4e33-b7af-2c58b2976171', '11111111-1111-1111-1111-111111111111', 'Client Company 1', 'contact@client1.com', 'ACTIVE', 'USD', 72
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '2f76c417-dfb2-4cb6-a3fd-0199d106573a', '11111111-1111-1111-1111-111111111111', 'Client Company 2', 'contact@client2.com', 'ACTIVE', 'USD', 147
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '86990aa9-de8b-494e-af1d-c2baa347ecd6', '11111111-1111-1111-1111-111111111111', 'Client Company 3', 'contact@client3.com', 'ACTIVE', 'USD', 112
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '469e9cae-d1ac-4071-bebc-52d9b1c259ba', '11111111-1111-1111-1111-111111111111', 'Client Company 4', 'contact@client4.com', 'ACTIVE', 'USD', 89
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'a8432add-1615-47b9-b319-5ee362f6d5cc', '11111111-1111-1111-1111-111111111111', 'Client Company 5', 'contact@client5.com', 'ACTIVE', 'USD', 58
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'cb3a0326-1456-41c2-9e35-888bd4a8b1e3', '11111111-1111-1111-1111-111111111111', 'Client Company 6', 'contact@client6.com', 'ACTIVE', 'USD', 83
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            '740a4994-ceac-4d7b-8960-7fe51d507746', '11111111-1111-1111-1111-111111111111', 'Client Company 7', 'contact@client7.com', 'ACTIVE', 'USD', 83
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '11111111-1111-1111-1111-111111111111', 'Client Company 8', 'contact@client8.com', 'ACTIVE', 'USD', 119
        );
INSERT INTO "company_test_company".clients (id, tenant_id, name, email, status, currency, default_hourly_rate) VALUES (
            'd479915f-7490-48fd-b68b-fbe29b3be4db', '11111111-1111-1111-1111-111111111111', 'Client Company 9', 'contact@client9.com', 'ACTIVE', 'USD', 195
        );

-- Projects
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '4b99117c-8b28-46ac-afc4-9635f560a862', '11111111-1111-1111-1111-111111111111', 'Project 0', 'PRJ-0', 'ACTIVE', 'd0414985-69b7-4e33-b7af-2c58b2976171', '6d40f245-854b-458b-b7ca-cb34536b4e41', 'HOURLY_RATE', 437255, '2026-01-13T17:51:39.760Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '686d3369-98f8-4aad-ad49-c34b76a31651', '11111111-1111-1111-1111-111111111111', 'Project 1', 'PRJ-1', 'ACTIVE', 'cb3a0326-1456-41c2-9e35-888bd4a8b1e3', '54836cbf-9f9a-42ef-9938-d4225a8f3d1a', 'FIXED', 954886, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            'e9706327-3fd5-4372-947d-5420cb28a616', '11111111-1111-1111-1111-111111111111', 'Project 2', 'PRJ-2', 'ACTIVE', '86990aa9-de8b-494e-af1d-c2baa347ecd6', '6d40f245-854b-458b-b7ca-cb34536b4e41', 'HOURLY_RATE', 30946, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', '11111111-1111-1111-1111-111111111111', 'Project 3', 'PRJ-3', 'ACTIVE', 'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '276f1edc-3a46-4801-94bf-b53bcf8df73c', 'HOURLY_RATE', 345510, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '6a6c11a3-729f-4117-a027-77b953b48323', '11111111-1111-1111-1111-111111111111', 'Project 4', 'PRJ-4', 'ACTIVE', 'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', 'HOURLY_RATE', 854356, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            'c27d39c3-de83-401a-a263-b0a8c2da8889', '11111111-1111-1111-1111-111111111111', 'Project 5', 'PRJ-5', 'ACTIVE', 'd0414985-69b7-4e33-b7af-2c58b2976171', '54836cbf-9f9a-42ef-9938-d4225a8f3d1a', 'FIXED', 57938, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '3216666e-2b24-4671-b85e-1b7d6a47c359', '11111111-1111-1111-1111-111111111111', 'Project 6', 'PRJ-6', 'ACTIVE', 'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '276f1edc-3a46-4801-94bf-b53bcf8df73c', 'FIXED', 160029, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '7cd0594d-93ed-4ebc-9344-df6e78393792', '11111111-1111-1111-1111-111111111111', 'Project 7', 'PRJ-7', 'ACTIVE', 'cb3a0326-1456-41c2-9e35-888bd4a8b1e3', '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', 'HOURLY_RATE', 354344, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            'cc709c29-6fa7-461d-b724-88298a39168e', '11111111-1111-1111-1111-111111111111', 'Project 8', 'PRJ-8', 'ACTIVE', 'f8e7cea0-cde6-4df5-b5f7-5181bfab0180', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', 'FIXED', 245669, '2026-01-13T17:51:39.761Z'
        );
INSERT INTO "company_test_company".projects (id, tenant_id, name, code, status, client_id, manager_id, budget_type, total_budget, start_date) VALUES (
            '5748ec76-1aab-445d-961e-b69e34f80c76', '11111111-1111-1111-1111-111111111111', 'Project 9', 'PRJ-9', 'ACTIVE', '994bdcc3-ca90-46bf-8314-bd6c29a94de6', 'ac72ce11-9f56-45b7-b83d-b99aa08fd1e9', 'FIXED', 115905, '2026-01-13T17:51:39.761Z'
        );

-- Project Budgets
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '4b99117c-8b28-46ac-afc4-9635f560a862', 2024, 7, 16110
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '686d3369-98f8-4aad-ad49-c34b76a31651', 2024, 4, 12615
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', 'e9706327-3fd5-4372-947d-5420cb28a616', 2024, 1, 19406
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', 2024, 2, 12343
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '6a6c11a3-729f-4117-a027-77b953b48323', 2024, 11, 7618
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', 'c27d39c3-de83-401a-a263-b0a8c2da8889', 2024, 8, 8501
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '3216666e-2b24-4671-b85e-1b7d6a47c359', 2024, 11, 1878
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '7cd0594d-93ed-4ebc-9344-df6e78393792', 2024, 3, 11186
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', 'cc709c29-6fa7-461d-b724-88298a39168e', 2024, 11, 13402
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".project_budgets (tenant_id, project_id, year, month, budget_amount) VALUES (
            '11111111-1111-1111-1111-111111111111', '5748ec76-1aab-445d-961e-b69e34f80c76', 2024, 12, 13392
        ) ON CONFLICT DO NOTHING;

-- Time Allocations
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', 'e9706327-3fd5-4372-947d-5420cb28a616', '57b652c5-41f5-4841-a786-8179441a9e6a', 2024, 4, 76
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', 'c27d39c3-de83-401a-a263-b0a8c2da8889', '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', 2024, 6, 31
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '4b99117c-8b28-46ac-afc4-9635f560a862', '86f6d4ae-6ea6-4e43-89b2-d3c9c8cba191', 2024, 5, 22
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', 2024, 5, 63
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', 'ac72ce11-9f56-45b7-b83d-b99aa08fd1e9', 2024, 12, 41
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', 'c27d39c3-de83-401a-a263-b0a8c2da8889', '57b652c5-41f5-4841-a786-8179441a9e6a', 2024, 1, 12
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', 'e9706327-3fd5-4372-947d-5420cb28a616', '57b652c5-41f5-4841-a786-8179441a9e6a', 2024, 4, 77
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '5748ec76-1aab-445d-961e-b69e34f80c76', '6d40f245-854b-458b-b7ca-cb34536b4e41', 2024, 2, 18
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '686d3369-98f8-4aad-ad49-c34b76a31651', '86f6d4ae-6ea6-4e43-89b2-d3c9c8cba191', 2024, 5, 46
        ) ON CONFLICT DO NOTHING;
INSERT INTO "company_test_company".time_allocations (tenant_id, project_id, employee_id, year, month, allocated_hours) VALUES (
            '11111111-1111-1111-1111-111111111111', '6a6c11a3-729f-4117-a027-77b953b48323', '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', 2024, 7, 24
        ) ON CONFLICT DO NOTHING;

-- Time Entries
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '6d40f245-854b-458b-b7ca-cb34536b4e41', '6a6c11a3-729f-4117-a027-77b953b48323', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '2d6fae48-1173-4c6f-817b-de38806ac2db', '4b99117c-8b28-46ac-afc4-9635f560a862', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '2d6fae48-1173-4c6f-817b-de38806ac2db', '6a6c11a3-729f-4117-a027-77b953b48323', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '6d40f245-854b-458b-b7ca-cb34536b4e41', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '54836cbf-9f9a-42ef-9938-d4225a8f3d1a', '5748ec76-1aab-445d-961e-b69e34f80c76', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', '686d3369-98f8-4aad-ad49-c34b76a31651', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '555c0f24-9a41-4a9d-b636-c7b1b3a7eee1', 'c27d39c3-de83-401a-a263-b0a8c2da8889', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '8e9fa7cf-2b91-4e91-89e8-3bd8ac26531e', '10bb4a78-b0a8-4acb-8a79-88f74516a0ed', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '6d40f245-854b-458b-b7ca-cb34536b4e41', '3216666e-2b24-4671-b85e-1b7d6a47c359', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
INSERT INTO "company_test_company".time_entries (tenant_id, employee_id, project_id, date, minutes, hours, description, source, billable) VALUES (
            '11111111-1111-1111-1111-111111111111', '276f1edc-3a46-4801-94bf-b53bcf8df73c', '7cd0594d-93ed-4ebc-9344-df6e78393792', '2026-01-13', 60, 1.0, 'Working on stuff', 'MANUAL', true
        );
