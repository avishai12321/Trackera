-- ============================================
-- MOORE MANAGEMENT CONSULTING - COMPLETE TENANT SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Step 1: Create the company schema
CREATE SCHEMA IF NOT EXISTS company_moore_consulting;

-- Step 2: Ensure all enums exist in public schema (they're shared across schemas)
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

-- Step 3: Switch to company_moore_consulting schema for tables
SET search_path TO company_moore_consulting, public;

-- ============================================
-- TABLE 1: EMPLOYEES
-- ============================================
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

-- ============================================
-- TABLE 2: CLIENTS
-- ============================================
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

-- ============================================
-- TABLE 3: PROJECTS
-- ============================================
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

-- ============================================
-- TABLE 4: TIME_ENTRIES
-- ============================================
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
    calendar_event_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_entries_pkey PRIMARY KEY (id)
);

-- ============================================
-- TABLE 5: TIME_ALLOCATIONS
-- ============================================
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

-- ============================================
-- TABLE 6: PROJECT_BUDGETS
-- ============================================
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

-- ============================================
-- TABLE 7: PROJECT_MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    role TEXT DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, project_id, employee_id)
);

-- ============================================
-- TABLE 8: CALENDAR_CONNECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    provider "CalendarProvider" NOT NULL,
    provider_account_id TEXT,
    scopes TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    status "ConnectionStatus" DEFAULT 'ACTIVE',
    sync_cursor TEXT,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, provider)
);

-- ============================================
-- TABLE 9: CALENDAR_EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    connection_id UUID NOT NULL,
    provider "CalendarProvider" NOT NULL,
    provider_event_id TEXT NOT NULL,
    ical_uid TEXT,
    title TEXT,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    timezone TEXT,
    is_all_day BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    location TEXT,
    organizer TEXT,
    attendees JSONB,
    attendees_count INTEGER DEFAULT 0,
    conference_link TEXT,
    event_status TEXT DEFAULT 'confirmed',
    visibility TEXT DEFAULT 'default',
    updated_at_provider TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, connection_id, provider, provider_event_id)
);

-- ============================================
-- TABLE 10: EMPLOYEE_REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS employee_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    review_date DATE NOT NULL,
    score_presentation INTEGER,
    score_time_management INTEGER,
    score_excel_skills INTEGER,
    score_proficiency INTEGER,
    score_transparency INTEGER,
    score_creativity INTEGER,
    score_overall INTEGER,
    positive_skills TEXT[],
    improvement_skills TEXT[],
    action_items TEXT,
    employee_commentary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Employees indexes
CREATE INDEX IF NOT EXISTS employees_tenant_id_idx ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS employees_manager_id_idx ON employees(manager_id);
CREATE INDEX IF NOT EXISTS employees_status_idx ON employees(status);
CREATE INDEX IF NOT EXISTS employees_user_id_idx ON employees(user_id);

-- Clients indexes
CREATE INDEX IF NOT EXISTS clients_tenant_id_idx ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status);

-- Projects indexes
CREATE INDEX IF NOT EXISTS projects_tenant_id_idx ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_manager_id_idx ON projects(manager_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);

-- Time entries indexes
CREATE INDEX IF NOT EXISTS time_entries_tenant_id_idx ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS time_entries_employee_id_idx ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS time_entries_project_id_idx ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS time_entries_date_idx ON time_entries(tenant_id, date);
CREATE INDEX IF NOT EXISTS time_entries_calendar_event_id_idx ON time_entries(calendar_event_id);

-- Time allocations indexes
CREATE INDEX IF NOT EXISTS time_allocations_tenant_id_idx ON time_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS time_allocations_project_id_idx ON time_allocations(project_id);
CREATE INDEX IF NOT EXISTS time_allocations_employee_id_idx ON time_allocations(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS time_allocations_unique_key ON time_allocations(tenant_id, project_id, employee_id, year, month);

-- Project budgets indexes
CREATE INDEX IF NOT EXISTS project_budgets_tenant_id_idx ON project_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS project_budgets_project_id_idx ON project_budgets(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS project_budgets_unique_key ON project_budgets(tenant_id, project_id, year, month);

-- Project members indexes
CREATE INDEX IF NOT EXISTS idx_project_members_tenant ON project_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee ON project_members(employee_id);

-- Calendar connections indexes
CREATE INDEX IF NOT EXISTS idx_calendar_connections_tenant ON calendar_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id);

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_connection ON calendar_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at);

-- Employee reviews indexes
CREATE INDEX IF NOT EXISTS idx_employee_reviews_tenant ON employee_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_reviews_employee ON employee_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_reviews_reviewer ON employee_reviews(reviewer_id);

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Employees foreign keys
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_manager_id_fkey;
ALTER TABLE employees ADD CONSTRAINT employees_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Projects foreign keys
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_manager_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Time allocations foreign keys
ALTER TABLE time_allocations DROP CONSTRAINT IF EXISTS time_allocations_project_id_fkey;
ALTER TABLE time_allocations ADD CONSTRAINT time_allocations_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE time_allocations DROP CONSTRAINT IF EXISTS time_allocations_employee_id_fkey;
ALTER TABLE time_allocations ADD CONSTRAINT time_allocations_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Project budgets foreign keys
ALTER TABLE project_budgets DROP CONSTRAINT IF EXISTS project_budgets_project_id_fkey;
ALTER TABLE project_budgets ADD CONSTRAINT project_budgets_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Time entries foreign keys
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_project_id_fkey;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Project members foreign keys
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;
ALTER TABLE project_members ADD CONSTRAINT project_members_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_employee_id_fkey;
ALTER TABLE project_members ADD CONSTRAINT project_members_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Calendar events foreign keys
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_connection_id_fkey;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_connection_id_fkey
    FOREIGN KEY (connection_id) REFERENCES calendar_connections(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Employee reviews foreign keys
ALTER TABLE employee_reviews DROP CONSTRAINT IF EXISTS employee_reviews_employee_id_fkey;
ALTER TABLE employee_reviews ADD CONSTRAINT employee_reviews_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE employee_reviews DROP CONSTRAINT IF EXISTS employee_reviews_reviewer_id_fkey;
ALTER TABLE employee_reviews ADD CONSTRAINT employee_reviews_reviewer_id_fkey
    FOREIGN KEY (reviewer_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- ROW LEVEL SECURITY (Permissive for development)
-- ============================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_reviews ENABLE ROW LEVEL SECURITY;

-- Permissive policies (allow all for development)
DROP POLICY IF EXISTS "Allow all for employees" ON employees;
CREATE POLICY "Allow all for employees" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for clients" ON clients;
CREATE POLICY "Allow all for clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for projects" ON projects;
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for time_entries" ON time_entries;
CREATE POLICY "Allow all for time_entries" ON time_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for time_allocations" ON time_allocations;
CREATE POLICY "Allow all for time_allocations" ON time_allocations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for project_budgets" ON project_budgets;
CREATE POLICY "Allow all for project_budgets" ON project_budgets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for project_members" ON project_members;
CREATE POLICY "Allow all for project_members" ON project_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for calendar_connections" ON calendar_connections;
CREATE POLICY "Allow all for calendar_connections" ON calendar_connections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for calendar_events" ON calendar_events;
CREATE POLICY "Allow all for calendar_events" ON calendar_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for employee_reviews" ON employee_reviews;
CREATE POLICY "Allow all for employee_reviews" ON employee_reviews FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_allocations_updated_at ON time_allocations;
CREATE TRIGGER update_time_allocations_updated_at BEFORE UPDATE ON time_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON project_budgets;
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_connections_updated_at ON calendar_connections;
CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON calendar_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_reviews_updated_at ON employee_reviews;
CREATE TRIGGER update_employee_reviews_updated_at BEFORE UPDATE ON employee_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA company_moore_consulting TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA company_moore_consulting TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA company_moore_consulting TO anon, authenticated, service_role;

-- ============================================
-- PUBLIC SCHEMA: TENANT AND USER SETUP
-- ============================================
SET search_path TO public;

-- Create tenants table if not exists
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    schema_name TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table if not exists (for application authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    tenant_id UUID NOT NULL,
    status "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role "Role" NOT NULL,
    scope_type "RoleScopeType" DEFAULT 'TENANT',
    scope_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert tenant record
INSERT INTO tenants (id, name, schema_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'MOORE MANAGEMENT CONSULTING', 'company_moore_consulting')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, schema_name = EXCLUDED.schema_name;

-- Insert user (password: 123456, hashed with bcrypt)
-- Note: You will need to hash the password properly. This is a placeholder hash.
-- For actual deployment, use: await bcrypt.hash('123456', 10)
-- The hash below is for '123456' with bcrypt salt rounds 10
INSERT INTO users (id, email, username, password_hash, tenant_id, status)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'moore@moore.com',
    'moore_admin',
    '$2b$10$rDGPNqL6CnS0Z4/8VnXhOeO9.KjN9yPZqVaKPi1lhBQyXc0vL5Ezi', -- bcrypt hash of '123456'
    '22222222-2222-2222-2222-222222222222',
    'ACTIVE'
)
ON CONFLICT (tenant_id, email) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    status = EXCLUDED.status;

-- Insert user role
INSERT INTO user_roles (user_id, role, scope_type)
SELECT 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'OWNER', 'TENANT'
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' AND role = 'OWNER'
);

-- ============================================
-- RELOAD POSTGREST SCHEMA CACHE
-- ============================================
NOTIFY pgrst, 'reload config';

-- ============================================
-- VERIFICATION QUERIES (run after to verify)
-- ============================================
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'company_moore_consulting';
-- SELECT * FROM public.tenants WHERE id = '22222222-2222-2222-2222-222222222222';
-- SELECT * FROM public.users WHERE email = 'moore@moore.com';
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'company_moore_consulting';
