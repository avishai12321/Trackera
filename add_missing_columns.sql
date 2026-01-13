-- Add missing columns to existing tables in company_test_company schema
SET search_path TO company_test_company, public;

-- Step 1: Create new enums in public schema
SET search_path TO public;
DO $$ BEGIN CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ProjectBudgetType" AS ENUM ('FIXED', 'HOURLY_RATE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Step 2: Switch back to company schema
SET search_path TO company_test_company, public;

-- Step 3: Create clients table (new table)
CREATE TABLE IF NOT EXISTS clients (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID,
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

-- Step 4: Create time_allocations table (new table)
CREATE TABLE IF NOT EXISTS time_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID,
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

-- Step 5: Create project_budgets table (new table)
CREATE TABLE IF NOT EXISTS project_budgets (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID,
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

-- Step 6: Add missing columns to users table (your users = my employees)
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_capacity DECIMAL(10,2) DEFAULT 160.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_experience DECIMAL(4,1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Step 7: Add missing columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_type "ProjectBudgetType" DEFAULT 'FIXED';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_budget DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status);
CREATE INDEX IF NOT EXISTS time_allocations_project_id_idx ON time_allocations(project_id);
CREATE INDEX IF NOT EXISTS time_allocations_employee_id_idx ON time_allocations(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS time_allocations_unique_key ON time_allocations(project_id, employee_id, year, month);
CREATE INDEX IF NOT EXISTS project_budgets_project_id_idx ON project_budgets(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS project_budgets_unique_key ON project_budgets(project_id, year, month);
CREATE INDEX IF NOT EXISTS users_manager_id_idx ON users(manager_id);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_manager_id_idx ON projects(manager_id);

-- Step 9: Add foreign key constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_manager_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_manager_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE time_allocations DROP CONSTRAINT IF EXISTS time_allocations_project_id_fkey;
ALTER TABLE time_allocations ADD CONSTRAINT time_allocations_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE time_allocations DROP CONSTRAINT IF EXISTS time_allocations_employee_id_fkey;
ALTER TABLE time_allocations ADD CONSTRAINT time_allocations_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE project_budgets DROP CONSTRAINT IF EXISTS project_budgets_project_id_fkey;
ALTER TABLE project_budgets ADD CONSTRAINT project_budgets_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Enable RLS with permissive policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for clients" ON clients;
CREATE POLICY "Allow all for clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for time_allocations" ON time_allocations;
CREATE POLICY "Allow all for time_allocations" ON time_allocations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for project_budgets" ON project_budgets;
CREATE POLICY "Allow all for project_budgets" ON project_budgets FOR ALL USING (true) WITH CHECK (true);

-- Step 11: Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_allocations_updated_at ON time_allocations;
CREATE TRIGGER update_time_allocations_updated_at BEFORE UPDATE ON time_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON project_budgets;
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
