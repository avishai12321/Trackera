
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(tenantId: string, userId: string) {
        // 1. Resolve Employee ID
        const employee = await this.prisma.client.employee.findFirst({
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
            this.prisma.client.timeEntry.aggregate({
                where: {
                    tenantId,
                    employeeId,
                    date: { gte: todayStart, lte: todayEnd }
                },
                _sum: { minutes: true }
            }),
            // Week's total
            this.prisma.client.timeEntry.aggregate({
                where: {
                    tenantId,
                    employeeId,
                    date: { gte: weekStart, lte: weekEnd }
                },
                _sum: { minutes: true }
            }),
            // Billable Split (This Week)
            this.prisma.client.timeEntry.groupBy({
                by: ['billable'],
                where: {
                    tenantId,
                    employeeId,
                    date: { gte: weekStart, lte: weekEnd }
                },
                _sum: { minutes: true }
            }),
            // Recent Entries
            this.prisma.client.timeEntry.findMany({
                where: {
                    tenantId,
                    employeeId
                },
                orderBy: { date: 'desc' }, // Or startTime if combined
                take: 5,
                include: { project: true }
            }),
            // Active Projects Count
            this.prisma.client.project.count({
                where: {
                    tenantId,
                    status: 'ACTIVE'
                }
            }),
            // Project Distribution
            this.prisma.client.timeEntry.groupBy({
                by: ['projectId'],
                where: { tenantId },
                _sum: { minutes: true }
            }),
            // Employee Distribution 
            this.prisma.client.timeEntry.groupBy({
                by: ['employeeId'],
                where: { tenantId },
                _sum: { minutes: true }
            }),
            // Last 7 Days Activity (Raw)
            this.prisma.client.timeEntry.findMany({
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
            this.prisma.client.project.findMany({
                where: { id: { in: projectIds } },
                select: { id: true, name: true }
            }),
            this.prisma.client.employee.findMany({
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
