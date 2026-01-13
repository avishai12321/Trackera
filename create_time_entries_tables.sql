-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'ACTIVE',
    hire_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID,
    employee_id UUID NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    date DATE NOT NULL,
    minutes INTEGER,
    billable BOOLEAN DEFAULT false,
    calendar_event_id UUID,
    created_by_user_id UUID,
    updated_by_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_id ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for employees
CREATE POLICY "Users can view employees in their tenant" ON employees
    FOR SELECT
    USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

CREATE POLICY "Users can insert employees in their tenant" ON employees
    FOR INSERT
    WITH CHECK (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

CREATE POLICY "Users can update employees in their tenant" ON employees
    FOR UPDATE
    USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

-- RLS policies for time_entries
CREATE POLICY "Users can view time entries in their tenant" ON time_entries
    FOR SELECT
    USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

CREATE POLICY "Users can insert time entries in their tenant" ON time_entries
    FOR INSERT
    WITH CHECK (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

CREATE POLICY "Users can update time entries in their tenant" ON time_entries
    FOR UPDATE
    USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

CREATE POLICY "Users can delete time entries in their tenant" ON time_entries
    FOR DELETE
    USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));
