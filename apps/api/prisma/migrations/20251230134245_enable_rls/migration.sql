-- Enable RLS
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Note: We cast to text to avoid UUID casting issues with current_setting

CREATE POLICY tenant_isolation_tenants ON "tenants" USING ("id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_users ON "users" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_user_roles ON "user_roles" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_refresh_tokens ON "refresh_tokens" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_employees ON "employees" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_projects ON "projects" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_project_members ON "project_members" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_time_entries ON "time_entries" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_calendar_connections ON "calendar_connections" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_calendar_subscriptions ON "calendar_subscriptions" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_calendar_events ON "calendar_events" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_report_jobs ON "report_jobs" USING ("tenant_id"::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_audit_logs ON "audit_logs" USING ("tenant_id"::text = current_setting('app.tenant_id', true));