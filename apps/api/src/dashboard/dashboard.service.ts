
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../shared/supabase.service';
import {
    CompanyOverviewData,
    ProjectViewData,
    EmployeeOverviewData,
    EmployeeDeepDiveData
} from './dashboard.interfaces';

@Injectable()
export class DashboardService {
    constructor(private supabase: SupabaseService) { }

    /**
     * Get company schema name from tenant ID
     */
    private async getSchemaName(tenantId: string): Promise<string> {
        const { data, error } = await this.supabase.getAdminClient()
            .from('tenants')
            .select('schema_name')
            .eq('id', tenantId)
            .single();

        if (error || !data) {
            throw new Error(`Tenant not found for tenant ID: ${tenantId}`);
        }

        return data.schema_name;
    }

    /**
     * PAGE 1: Company Overview Dashboard
     */
    async getCompanyOverview(
        tenantId: string,
        startDate: string,
        endDate: string
    ): Promise<CompanyOverviewData> {
        const schemaName = await this.getSchemaName(tenantId);

        const { data, error } = await this.supabase.getAdminClient()
            .rpc('get_company_overview', {
                p_schema_name: schemaName,
                p_start_date: startDate,
                p_end_date: endDate
            });

        if (error) throw new Error(`Failed to get company overview: ${error.message}`);
        return data;
    }

    /**
     * PAGE 2: Project View Dashboard
     */
    async getProjectView(
        tenantId: string,
        projectId: string,
        startDate: string,
        endDate: string
    ): Promise<ProjectViewData> {
        const schemaName = await this.getSchemaName(tenantId);

        const { data, error } = await this.supabase.getAdminClient()
            .rpc('get_project_view', {
                p_schema_name: schemaName,
                p_project_id: projectId,
                p_start_date: startDate,
                p_end_date: endDate
            });

        if (error) throw new Error(`Failed to get project view: ${error.message}`);
        return data;
    }

    /**
     * PAGE 3: Employee Overview Dashboard
     */
    async getEmployeeOverview(
        tenantId: string,
        startDate: string,
        endDate: string
    ): Promise<EmployeeOverviewData> {
        const schemaName = await this.getSchemaName(tenantId);

        const { data, error } = await this.supabase.getAdminClient()
            .rpc('get_employee_overview', {
                p_schema_name: schemaName,
                p_start_date: startDate,
                p_end_date: endDate
            });

        if (error) throw new Error(`Failed to get employee overview: ${error.message}`);
        return data;
    }

    /**
     * PAGE 4: Employee Deep Dive Dashboard
     */
    async getEmployeeDeepDive(
        tenantId: string,
        employeeId: string,
        startDate: string,
        endDate: string
    ): Promise<EmployeeDeepDiveData> {
        const schemaName = await this.getSchemaName(tenantId);

        const { data, error } = await this.supabase.getAdminClient()
            .rpc('get_employee_deep_dive', {
                p_schema_name: schemaName,
                p_employee_id: employeeId,
                p_start_date: startDate,
                p_end_date: endDate
            });

        if (error) throw new Error(`Failed to get employee deep dive: ${error.message}`);
        return data;
    }

    /**
     * LEGACY: Keep existing getStats method for backward compatibility
     */
    async getStats(tenantId: string, userId: string) {
        // Use tenant-specific client for proper schema isolation
        const client = this.supabase.getClientForTenant(tenantId);

        // 1. Resolve Employee ID
        const { data: employee, error: empError } = await client
            .from('employees')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .maybeSingle();

        if (empError) {
            console.error('Error fetching employee:', empError);
        }

        if (!employee) {
            return {
                today: 0,
                week: 0,
                billableSplit: [],
                recentEntries: []
            };
        }

        const employeeId = employee.id;
        const now = new Date();

        // Today range
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // Week range (Mon-Sun)
        const day = now.getDay() || 7;
        const weekStartDate = new Date(now);
        if (day !== 1) weekStartDate.setHours(-24 * (day - 1));
        const weekStart = new Date(weekStartDate);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Parallel Queries using Supabase
        const [
            todayEntries,
            weekEntries,
            recentEntriesResult,
            activeProjects,
            projectDistResult,
            employeeDistResult,
            last7DaysResult
        ] = await Promise.all([
            // Today's entries
            client
                .from('time_entries')
                .select('minutes')
                .eq('tenant_id', tenantId)
                .eq('employee_id', employeeId)
                .gte('date', todayStart.toISOString().split('T')[0])
                .lte('date', todayEnd.toISOString().split('T')[0]),

            // Week's entries
            client
                .from('time_entries')
                .select('minutes, billable')
                .eq('tenant_id', tenantId)
                .eq('employee_id', employeeId)
                .gte('date', weekStart.toISOString().split('T')[0])
                .lte('date', weekEnd.toISOString().split('T')[0]),

            // Recent Entries
            client
                .from('time_entries')
                .select('id, description, minutes, date, project:projects(name)')
                .eq('tenant_id', tenantId)
                .eq('employee_id', employeeId)
                .order('date', { ascending: false })
                .limit(5),

            // Active Projects Count
            client
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('status', 'ACTIVE'),

            // Project Distribution
            client
                .from('time_entries')
                .select('project_id, minutes')
                .eq('tenant_id', tenantId),

            // Employee Distribution
            client
                .from('time_entries')
                .select('employee_id, minutes')
                .eq('tenant_id', tenantId),

            // Last 7 Days Activity
            client
                .from('time_entries')
                .select('date, minutes')
                .eq('tenant_id', tenantId)
                .gte('date', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0])
        ]);

        // Calculate today's total
        const todayMinutes = (todayEntries.data || []).reduce((sum: number, e: any) => sum + (e.minutes || 0), 0);

        // Calculate week's total and billable split
        const weekData = weekEntries.data || [];
        const weekMinutes = weekData.reduce((sum: number, e: any) => sum + (e.minutes || 0), 0);

        // Billable Split
        const billableMap = new Map<boolean, number>();
        weekData.forEach((e: any) => {
            const key = e.billable || false;
            billableMap.set(key, (billableMap.get(key) || 0) + (e.minutes || 0));
        });
        const billableSplit = Array.from(billableMap.entries()).map(([billable, minutes]) => ({
            billable,
            minutes
        }));

        // Recent Entries
        const recentEntries = (recentEntriesResult.data || []).map((e: any) => ({
            id: e.id,
            description: e.description,
            project: e.project?.name || 'Unknown',
            minutes: e.minutes,
            date: e.date
        }));

        // Project Distribution - aggregate by project
        const projectDistMap = new Map<string, number>();
        (projectDistResult.data || []).forEach((e: any) => {
            if (e.project_id) {
                projectDistMap.set(e.project_id, (projectDistMap.get(e.project_id) || 0) + (e.minutes || 0));
            }
        });

        // Employee Distribution - aggregate by employee
        const employeeDistMap = new Map<string, number>();
        (employeeDistResult.data || []).forEach((e: any) => {
            if (e.employee_id) {
                employeeDistMap.set(e.employee_id, (employeeDistMap.get(e.employee_id) || 0) + (e.minutes || 0));
            }
        });

        // Fetch project and employee names
        const projectIds = Array.from(projectDistMap.keys());
        const employeeIds = Array.from(employeeDistMap.keys());

        const [projectsResult, employeesResult] = await Promise.all([
            projectIds.length > 0
                ? client.from('projects').select('id, name').in('id', projectIds)
                : { data: [] },
            employeeIds.length > 0
                ? client.from('employees').select('id, first_name, last_name').in('id', employeeIds)
                : { data: [] }
        ]);

        const projectLookup = new Map((projectsResult.data || []).map((p: any) => [p.id, p.name]));
        const employeeLookup = new Map((employeesResult.data || []).map((e: any) => [e.id, `${e.first_name} ${e.last_name}`]));

        const projectDistribution = Array.from(projectDistMap.entries()).map(([id, value]) => ({
            name: projectLookup.get(id) || 'Unknown',
            value
        }));

        const employeeDistribution = Array.from(employeeDistMap.entries()).map(([id, value]) => ({
            name: employeeLookup.get(id) || 'Unknown',
            value
        }));

        // Process Daily Activity
        const dailyMap = new Map<string, number>();
        const sevenDaysKeys: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const k = d.toISOString().split('T')[0];
            sevenDaysKeys.push(k);
            dailyMap.set(k, 0);
        }

        (last7DaysResult.data || []).forEach((e: any) => {
            const k = e.date;
            if (dailyMap.has(k)) {
                dailyMap.set(k, dailyMap.get(k)! + (e.minutes || 0));
            }
        });

        const dailyActivity = sevenDaysKeys.map((k: string) => ({
            date: k,
            minutes: dailyMap.get(k) || 0
        }));

        return {
            todayMinutes,
            weekMinutes,
            billableSplit,
            recentEntries,
            activeProjectsCount: activeProjects.count || 0,
            projectDistribution,
            employeeDistribution,
            dailyActivity
        };
    }
}
