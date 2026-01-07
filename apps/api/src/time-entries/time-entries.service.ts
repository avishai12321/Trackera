import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTimeEntryDto, UpdateTimeEntryDto, TimeEntryDto } from '@time-tracker/dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeEntriesService {
    constructor(private prisma: PrismaService) { }

    async create(createTimeEntryDto: CreateTimeEntryDto, tenantId: string, userId: string) {
        return this.prisma.client.timeEntry.create({
            data: {
                tenantId,
                projectId: createTimeEntryDto.projectId,
                employeeId: createTimeEntryDto.employeeId,
                description: createTimeEntryDto.description,
                startTime: new Date(createTimeEntryDto.startTime),
                date: new Date(createTimeEntryDto.startTime),
                endTime: createTimeEntryDto.endTime ? new Date(createTimeEntryDto.endTime) : null,
                minutes: createTimeEntryDto.durationMinutes, // Map to schema 'minutes'
                // billable: createTimeEntryDto.billable // Schema doesn't have billable yet
                createdByUserId: userId,
                updatedByUserId: userId
            }
        });
    }

    async findAll(tenantId: string, employeeId?: string, projectId?: string, from?: string, to?: string) {
        const where: any = { tenantId };

        if (employeeId) where.employeeId = employeeId;
        if (projectId) where.projectId = projectId;

        if (from || to) {
            where.startTime = {};
            if (from) where.startTime.gte = new Date(from);
            if (to) where.startTime.lte = new Date(to);
        }

        return this.prisma.client.timeEntry.findMany({
            where,
            include: { project: true, employee: true },
            orderBy: { startTime: 'desc' }
        });
    }

    async findOne(id: string) {
        const entry = await this.prisma.client.timeEntry.findUnique({
            where: { id },
            include: { project: true, employee: true }
        });
        if (!entry) throw new NotFoundException(`Time Entry #${id} not found`);
        return entry;
    }

    async getSuggestions(tenantId: string, userId: string, dateString: string) {
        const date = new Date(dateString);
        const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

        // 1. Get Calendar Events for this User (all connections)
        const calendarEvents = await this.prisma.client.calendarEvent.findMany({
            where: {
                tenantId,
                connection: {
                    userId: userId
                },
                startAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        if (calendarEvents.length === 0) return [];

        // 2. Get Existing Time Entries (to exclude already converted)
        // We need employeeId for TimeEntry
        const employee = await this.prisma.client.employee.findFirst({ where: { tenantId, userId } });
        if (!employee) return []; // Should not happen for valid user, but handle it

        const existingEntries = await this.prisma.client.timeEntry.findMany({
            where: {
                tenantId,
                employeeId: employee.id,
                date: {
                    gte: startOfDay,
                    lte: endOfDay // Comparing Date type in DB (which stores 00:00:00 usually if @db.Date, but Prisma treats Date object)
                },
                calendarEventId: { not: null }
            },
            select: { calendarEventId: true }
        });

        const existingEventIds = new Set(existingEntries.map((e: any) => e.calendarEventId));

        // 3. Filter and Map
        return calendarEvents
            .filter((event: any) => !existingEventIds.has(event.id))
            .map((event: any) => ({
                id: event.id,
                title: event.title,
                startTime: event.startAt,
                endTime: event.endAt,
                durationMinutes: Math.round((event.endAt.getTime() - event.startAt.getTime()) / 60000),
                provider: event.provider
            }));
    }

    async update(id: string, updateTimeEntryDto: UpdateTimeEntryDto, userId: string) {
        const data: any = {
            ...updateTimeEntryDto,
            startTime: updateTimeEntryDto.startTime ? new Date(updateTimeEntryDto.startTime) : undefined,
            endTime: updateTimeEntryDto.endTime ? new Date(updateTimeEntryDto.endTime) : undefined,
            updatedByUserId: userId
        };

        if (updateTimeEntryDto.durationMinutes) {
            data.minutes = updateTimeEntryDto.durationMinutes;
            delete data.durationMinutes;
        }

        return this.prisma.client.timeEntry.update({
            where: { id },
            data
        });
    }

    async remove(id: string) {
        return this.prisma.client.timeEntry.delete({
            where: { id },
        });
    }
}
