-- Create projects table in Supabase
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    client_id UUID,
    manager_id UUID,
    budget_type TEXT DEFAULT 'FIXED',
    total_budget DECIMAL(10, 2),
    estimated_hours DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for tenant_id for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to see projects in their tenant
CREATE POLICY "Users can view projects in their tenant" ON projects
    FOR SELECT
    USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

-- Create RLS policy to allow users to insert projects in their tenant
CREATE POLICY "Users can insert projects in their tenant" ON projects
    FOR INSERT
    WITH CHECK (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

-- Create RLS policy to allow users to update projects in their tenant
CREATE POLICY "Users can update projects in their tenant" ON projects
    FOR UPDATE
    USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));

-- Create RLS policy to allow users to delete projects in their tenant
CREATE POLICY "Users can delete projects in their tenant" ON projects
    FOR DELETE
    USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'company_id'));
