import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CreateTimeEntryDto, UpdateTimeEntryDto, TimeEntryDto } from '@time-tracker/dto';
import { SupabaseService } from '../shared/supabase.service';

@Injectable()
export class TimeEntriesService {
    private readonly logger = new Logger(TimeEntriesService.name);
    constructor(private supabase: SupabaseService) { }

    async create(createTimeEntryDto: CreateTimeEntryDto, tenantId: string, userId: string) {
        this.logger.log(`Creating time entry for tenant: ${tenantId}, user: ${userId}`);
        this.logger.log(`DTO: ${JSON.stringify(createTimeEntryDto)}`);

        const insertData = {
            tenant_id: tenantId,
            project_id: createTimeEntryDto.projectId,
            employee_id: createTimeEntryDto.employeeId,
            description: createTimeEntryDto.description,
            start_time: new Date(createTimeEntryDto.startTime).toISOString(),
            date: new Date(createTimeEntryDto.startTime).toISOString().split('T')[0],
            end_time: createTimeEntryDto.endTime ? new Date(createTimeEntryDto.endTime).toISOString() : null,
            minutes: createTimeEntryDto.durationMinutes,
            billable: createTimeEntryDto.billable ?? true,
            calendar_event_id: createTimeEntryDto.calendarEventId || null,
            created_by_user_id: userId,
            updated_by_user_id: userId
        };

        this.logger.log(`Insert data: ${JSON.stringify(insertData)}`);

        // Use tenant-specific schema client
        const { data, error } = await this.supabase.getClientForTenant(tenantId)
            .from('time_entries')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to create time entry: ${error.message}`, error);
            throw new Error(`Failed to create time entry: ${error.message}`);
        }

        this.logger.log(`Time entry created successfully: ${JSON.stringify(data)}`);
        return data;
    }

    async findAll(tenantId: string, employeeId?: string, projectId?: string, from?: string, to?: string) {
        // Use tenant-specific schema client
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        // Fetch time entries without automatic joins (to avoid schema cache issues)
        let query = tenantClient
            .from('time_entries')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('start_time', { ascending: false });

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (projectId) query = query.eq('project_id', projectId);
        if (from) query = query.gte('start_time', new Date(from).toISOString());
        if (to) query = query.lte('start_time', new Date(to).toISOString());

        const { data: timeEntries, error } = await query;

        if (error) throw new Error(`Failed to fetch time entries: ${error.message}`);
        if (!timeEntries || timeEntries.length === 0) return [];

        // Get unique project and employee IDs
        const projectIds = [...new Set(timeEntries.map(e => e.project_id).filter(Boolean))];
        const employeeIds = [...new Set(timeEntries.map(e => e.employee_id).filter(Boolean))];

        // Fetch projects and employees separately (also in tenant schema)
        const [projectsResult, employeesResult] = await Promise.all([
            projectIds.length > 0
                ? tenantClient
                    .from('projects')
                    .select('*')
                    .in('id', projectIds)
                : { data: [] },
            employeeIds.length > 0
                ? tenantClient
                    .from('employees')
                    .select('*')
                    .in('id', employeeIds)
                : { data: [] }
        ]);

        const projectsMap = new Map((projectsResult.data || []).map(p => [p.id, p]));
        const employeesMap = new Map((employeesResult.data || []).map(e => [e.id, e]));

        // Combine the data
        return timeEntries.map(entry => ({
            ...entry,
            project: entry.project_id ? projectsMap.get(entry.project_id) || null : null,
            employee: entry.employee_id ? employeesMap.get(entry.employee_id) || null : null
        }));
    }

    async findOne(id: string, tenantId: string) {
        // Use tenant-specific schema client
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        const { data: entry, error } = await tenantClient
            .from('time_entries')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !entry) {
            throw new NotFoundException(`Time Entry #${id} not found`);
        }

        // Fetch project and employee separately (also in tenant schema)
        const [projectResult, employeeResult] = await Promise.all([
            entry.project_id
                ? tenantClient
                    .from('projects')
                    .select('*')
                    .eq('id', entry.project_id)
                    .single()
                : { data: null },
            entry.employee_id
                ? tenantClient
                    .from('employees')
                    .select('*')
                    .eq('id', entry.employee_id)
                    .single()
                : { data: null }
        ]);

        return {
            ...entry,
            project: projectResult.data || null,
            employee: employeeResult.data || null
        };
    }

    async getSuggestions(tenantId: string, userId: string, startDate: string, endDate: string) {
        // Safe date parsing (UTC)
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

        const rangeStart = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const rangeEnd = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

        this.logger.log(`Fetching suggestions for tenant: ${tenantId}, user: ${userId}`);
        this.logger.log(`Range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`);

        // Use tenant-specific schema client for calendar data
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        // 1. Get Calendar Events for this User (all connections)
        // We use !inner join to filter by connection.user_id
        const { data: calendarEvents, error: eventsError } = await tenantClient
            .from('calendar_events')
            .select('*, connection:calendar_connections!inner(user_id)')
            .eq('tenant_id', tenantId)
            .eq('connection.user_id', userId)
            .gte('start_at', rangeStart.toISOString())
            .lte('start_at', rangeEnd.toISOString());

        if (eventsError) {
            this.logger.error(`Join query failed: ${eventsError.message}. Trying fallback...`);

            // Fallback: Get connections first, then events
            const { data: userConns } = await tenantClient
                .from('calendar_connections')
                .select('id')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            if (!userConns || userConns.length === 0) return [];

            const connIds = userConns.map(c => c.id);
            const { data: fallbackEvents, error: fallbackError } = await tenantClient
                .from('calendar_events')
                .select('*')
                .eq('tenant_id', tenantId)
                .in('connection_id', connIds)
                .gte('start_at', rangeStart.toISOString())
                .lte('start_at', rangeEnd.toISOString());

            if (fallbackError) {
                this.logger.error('Fallback query also failed', fallbackError);
                return [];
            }

            this.logger.log(`Found ${fallbackEvents?.length || 0} events via fallback`);
            return this.processSuggestions(tenantId, userId, rangeStart, rangeEnd, fallbackEvents || []);
        }

        this.logger.log(`Found ${calendarEvents?.length || 0} calendar events`);

        if (!calendarEvents || calendarEvents.length === 0) {
            return [];
        }

        return this.processSuggestions(tenantId, userId, rangeStart, rangeEnd, calendarEvents);
    }

    private async processSuggestions(tenantId: string, userId: string, startOfDay: Date, endOfDay: Date, calendarEvents: any[]) {
        // Use tenant-specific schema client for employees and time_entries
        const tenantClient = this.supabase.getClientForTenant(tenantId);

        // 2. Get Employee ID for this user (in tenant schema)
        let { data: employee, error: empError } = await tenantClient
            .from('employees')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .maybeSingle();

        if (empError) {
            this.logger.error('Error fetching employee', empError);
            return [];
        }

        if (!employee) {
            this.logger.log(`Auto-creating employee record for user ${userId}`);
            // Get user info from auth (admin client for auth operations)
            const { data: { user } } = await this.supabase.getAdminClient().auth.admin.getUserById(userId);

            const { data: newEmp, error: createError } = await tenantClient
                .from('employees')
                .insert({
                    tenant_id: tenantId,
                    user_id: userId,
                    first_name: user?.user_metadata?.first_name || 'Calendar',
                    last_name: user?.user_metadata?.last_name || 'User',
                    email: user?.email || '',
                    status: 'ACTIVE'
                })
                .select('id')
                .single();

            if (createError) {
                this.logger.error('Failed to auto-create employee', createError);
                return [];
            }
            employee = newEmp;
        }

        // 3. Get Existing Time Entries (to exclude already converted) - in tenant schema
        const { data: existingEntries } = await tenantClient
            .from('time_entries')
            .select('calendar_event_id')
            .eq('tenant_id', tenantId)
            .eq('employee_id', employee.id)
            .gte('date', startOfDay.toISOString().split('T')[0])
            .lte('date', endOfDay.toISOString().split('T')[0])
            .not('calendar_event_id', 'is', null);

        const existingEventIds = new Set(existingEntries?.map((e: any) => e.calendar_event_id) || []);
        this.logger.log(`Excluding ${existingEventIds.size} existing events`);

        // 4. Filter and Map
        const filtered = calendarEvents.filter((event: any) => !existingEventIds.has(event.id));
        this.logger.log(`Returning ${filtered.length} suggestions`);

        return filtered.map((event: any) => ({
            id: event.id,
            title: event.title,
            description: event.description || null,
            startTime: event.start_at,
            endTime: event.end_at,
            durationMinutes: Math.round((new Date(event.end_at).getTime() - new Date(event.start_at).getTime()) / 60000),
            provider: event.provider,
            location: event.location || null,
            organizer: event.organizer || null,
            attendees: event.attendees || [],
            attendeesCount: event.attendees_count || 0,
            conferenceLink: event.conference_link || null,
            eventStatus: event.event_status || 'confirmed'
        }));
    }

    async update(id: string, updateTimeEntryDto: UpdateTimeEntryDto, userId: string, tenantId: string) {
        const updateData: any = {
            updated_by_user_id: userId
        };

        if (updateTimeEntryDto.description !== undefined) updateData.description = updateTimeEntryDto.description;
        if (updateTimeEntryDto.startTime) updateData.start_time = new Date(updateTimeEntryDto.startTime).toISOString();
        if (updateTimeEntryDto.endTime) updateData.end_time = new Date(updateTimeEntryDto.endTime).toISOString();
        if (updateTimeEntryDto.durationMinutes) updateData.minutes = updateTimeEntryDto.durationMinutes;

        // Use tenant-specific schema client
        const { data, error } = await this.supabase.getClientForTenant(tenantId)
            .from('time_entries')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update time entry: ${error.message}`);
        return data;
    }

    async remove(id: string, tenantId: string) {
        // Use tenant-specific schema client
        const { error } = await this.supabase.getClientForTenant(tenantId)
            .from('time_entries')
            .delete()
            .eq('id', id);

        if (error) throw new Error(`Failed to delete time entry: ${error.message}`);
        return { success: true };
    }
}
