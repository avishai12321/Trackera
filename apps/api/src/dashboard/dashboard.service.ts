
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CompanyOverviewData,
    ProjectViewData,
    EmployeeOverviewData,
    EmployeeDeepDiveData
} from './dashboard.interfaces';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get company schema name from tenant ID
     * For now, we'll use a simple mapping - you may want to query the public.companies table
     */
    private async getSchemaName(tenantId: string): Promise<string> {
        // Query the public.companies table to get schema_name from tenant ID
        const result = await this.prisma.db.$queryRawUnsafe<{ schema_name: string }[]>(
            'SELECT schema_name FROM public.companies WHERE id = $1',
            tenantId
        );

        if (!result || result.length === 0) {
            throw new Error(`Company not found for tenant ID: ${tenantId}`);
        }

        return result[0].schema_name;
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

        const result = await this.prisma.db.$queryRawUnsafe<{ get_company_overview: CompanyOverviewData }[]>(
            'SELECT public.get_company_overview($1, $2::date, $3::date) as get_company_overview',
            schemaName,
            startDate,
            endDate
        );

        return result[0].get_company_overview;
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

        const result = await this.prisma.db.$queryRawUnsafe<{ get_project_view: ProjectViewData }[]>(
            'SELECT public.get_project_view($1, $2::uuid, $3::date, $4::date) as get_project_view',
            schemaName,
            projectId,
            startDate,
            endDate
        );

        return result[0].get_project_view;
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

        const result = await this.prisma.db.$queryRawUnsafe<{ get_employee_overview: EmployeeOverviewData }[]>(
            'SELECT public.get_employee_overview($1, $2::date, $3::date) as get_employee_overview',
            schemaName,
            startDate,
            endDate
        );

        return result[0].get_employee_overview;
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

        const result = await this.prisma.db.$queryRawUnsafe<{ get_employee_deep_dive: EmployeeDeepDiveData }[]>(
            'SELECT public.get_employee_deep_dive($1, $2::uuid, $3::date, $4::date) as get_employee_deep_dive',
            schemaName,
            employeeId,
            startDate,
            endDate
        );

        return result[0].get_employee_deep_dive;
    }

    /**
     * LEGACY: Keep existing getStats method for backward compatibility
     */
    async getStats(tenantId: string, userId: string) {
        // 1. Resolve Employee ID
        const employee = await this.prisma.db.employee.findFirst({
            where: { tenantId, userId }
        });

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
        const day = now.getDay() || 7; // Get current day number, converting Sun (0) to 7
        if (day !== 1) now.setHours(-24 * (day - 1)); // Go back to Monday
        const weekStart = new Date(now);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Parallel Queries
        const [todayAgg, weekAgg, billableAgg, recentEntries, activeProjects, projectDistAgg, employeeDistAgg, last7DaysRaw] = await Promise.all([
            // Today's total
            this.prisma.db.timeEntry.aggregate({
                where: {
                    tenantId,
                    employeeId,
                    date: { gte: todayStart, lte: todayEnd }
                },
                _sum: { minutes: true }
            }),
            // Week's total
            this.prisma.db.timeEntry.aggregate({
                where: {
                    tenantId,
                    employeeId,
                    date: { gte: weekStart, lte: weekEnd }
                },
                _sum: { minutes: true }
            }),
            // Billable Split (This Week)
            this.prisma.db.timeEntry.groupBy({
                by: ['billable'],
                where: {
                    tenantId,
                    employeeId,
                    date: { gte: weekStart, lte: weekEnd }
                },
                _sum: { minutes: true }
            }),
            // Recent Entries
            this.prisma.db.timeEntry.findMany({
                where: {
                    tenantId,
                    employeeId
                },
                orderBy: { date: 'desc' }, // Or startTime if combined
                take: 5,
                include: { project: true }
            }),
            // Active Projects Count
            this.prisma.db.project.count({
                where: {
                    tenantId,
                    status: 'ACTIVE'
                }
            }),
            // Project Distribution
            this.prisma.db.timeEntry.groupBy({
                by: ['projectId'],
                where: { tenantId },
                _sum: { minutes: true }
            }),
            // Employee Distribution 
            this.prisma.db.timeEntry.groupBy({
                by: ['employeeId'],
                where: { tenantId },
                _sum: { minutes: true }
            }),
            // Last 7 Days Activity (Raw)
            this.prisma.db.timeEntry.findMany({
                where: {
                    tenantId,
                    date: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
                },
                select: { date: true, minutes: true }
            })
        ]);

        // Post-process names
        const projectIds = projectDistAgg.map((p: any) => p.projectId).filter(Boolean) as string[];
        const employeeIds = employeeDistAgg.map((e: any) => e.employeeId).filter(Boolean) as string[];

        const [projectsMap, employeesMap] = await Promise.all([
            this.prisma.db.project.findMany({
                where: { id: { in: projectIds } },
                select: { id: true, name: true }
            }),
            this.prisma.db.employee.findMany({
                where: { id: { in: employeeIds } },
                select: { id: true, firstName: true, lastName: true }
            })
        ]);

        const projectLookup = new Map(projectsMap.map((p: any) => [p.id, p.name]));
        const employeeLookup = new Map(employeesMap.map((e: any) => [e.id, `${e.firstName} ${e.lastName}`]));

        const projectDistribution = projectDistAgg.map((p: any) => ({
            name: projectLookup.get(p.projectId!) || 'Unknown',
            value: p._sum.minutes || 0
        }));

        const employeeDistribution = employeeDistAgg.map((e: any) => ({
            name: employeeLookup.get(e.employeeId!) || 'Unknown',
            value: e._sum.minutes || 0
        }));

        // Process Daily Activity
        // Bucket by YYYY-MM-DD
        const dailyMap = new Map<string, number>();
        const sevenDaysKeys: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const k = d.toISOString().split('T')[0];
            sevenDaysKeys.push(k);
            dailyMap.set(k, 0);
        }

        last7DaysRaw.forEach((e: any) => {
            const k = new Date(e.date).toISOString().split('T')[0];
            if (dailyMap.has(k)) {
                dailyMap.set(k, dailyMap.get(k)! + e.minutes);
            }
        });

        const dailyActivity = sevenDaysKeys.map((k: string) => ({
            date: k,
            minutes: dailyMap.get(k) || 0
        }));

        return {
            todayMinutes: todayAgg._sum.minutes || 0,
            weekMinutes: weekAgg._sum.minutes || 0,
            billableSplit: billableAgg.map((b: any) => ({ billable: b.billable, minutes: b._sum.minutes || 0 })),
            recentEntries: recentEntries.map((e: any) => ({
                id: e.id,
                description: e.description,
                project: e.project.name,
                minutes: e.minutes,
                date: e.date
            })),
            activeProjectsCount: activeProjects,
            projectDistribution,
            employeeDistribution,
            dailyActivity
        };
    }
}
