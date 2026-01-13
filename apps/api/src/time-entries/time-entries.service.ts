import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CreateTimeEntryDto, UpdateTimeEntryDto, TimeEntryDto } from '@time-tracker/dto';
import { SupabaseService } from '../shared/supabase.service';

@Injectable()
export class TimeEntriesService {
    private readonly logger = new Logger(TimeEntriesService.name);
    constructor(private supabase: SupabaseService) { }

    async create(createTimeEntryDto: CreateTimeEntryDto, tenantId: string, userId: string) {
        const { data, error } = await this.supabase.getAdminClient()
            .from('time_entries')
            .insert({
                tenant_id: tenantId,
                project_id: createTimeEntryDto.projectId,
                employee_id: createTimeEntryDto.employeeId,
                description: createTimeEntryDto.description,
                start_time: new Date(createTimeEntryDto.startTime).toISOString(),
                date: new Date(createTimeEntryDto.startTime).toISOString().split('T')[0],
                end_time: createTimeEntryDto.endTime ? new Date(createTimeEntryDto.endTime).toISOString() : null,
                minutes: createTimeEntryDto.durationMinutes,
                created_by_user_id: userId,
                updated_by_user_id: userId
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create time entry: ${error.message}`);
        return data;
    }

    async findAll(tenantId: string, employeeId?: string, projectId?: string, from?: string, to?: string) {
        let query = this.supabase.getAdminClient()
            .from('time_entries')
            .select('*, project:projects(*), employee:employees(*)')
            .eq('tenant_id', tenantId)
            .order('start_time', { ascending: false });

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (projectId) query = query.eq('project_id', projectId);
        if (from) query = query.gte('start_time', new Date(from).toISOString());
        if (to) query = query.lte('start_time', new Date(to).toISOString());

        const { data, error } = await query;

        if (error) throw new Error(`Failed to fetch time entries: ${error.message}`);
        return data || [];
    }

    async findOne(id: string) {
        const { data, error } = await this.supabase.getAdminClient()
            .from('time_entries')
            .select('*, project:projects(*), employee:employees(*)')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException(`Time Entry #${id} not found`);
        }
        return data;
    }

    async getSuggestions(tenantId: string, userId: string, dateString: string) {
        // Safe date parsing (UTC)
        const [year, month, day] = dateString.split('-').map(Number);
        const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

        this.logger.log(`Fetching suggestions for tenant: ${tenantId}, user: ${userId}, date: ${dateString}`);
        this.logger.log(`Range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

        // 1. Get Calendar Events for this User (all connections)
        // We use !inner join to filter by connection.user_id
        const { data: calendarEvents, error: eventsError } = await this.supabase.getAdminClient()
            .from('calendar_events')
            .select('*, connection:calendar_connections!inner(user_id)')
            .eq('tenant_id', tenantId)
            .eq('connection.user_id', userId)
            .gte('start_at', startOfDay.toISOString())
            .lte('start_at', endOfDay.toISOString());

        if (eventsError) {
            this.logger.error(`Join query failed: ${eventsError.message}. Trying fallback...`);

            // Fallback: Get connections first, then events
            const { data: userConns } = await this.supabase.getAdminClient()
                .from('calendar_connections')
                .select('id')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            if (!userConns || userConns.length === 0) return [];

            const connIds = userConns.map(c => c.id);
            const { data: fallbackEvents, error: fallbackError } = await this.supabase.getAdminClient()
                .from('calendar_events')
                .select('*')
                .eq('tenant_id', tenantId)
                .in('connection_id', connIds)
                .gte('start_at', startOfDay.toISOString())
                .lte('start_at', endOfDay.toISOString());

            if (fallbackError) {
                this.logger.error('Fallback query also failed', fallbackError);
                return [];
            }

            this.logger.log(`Found ${fallbackEvents?.length || 0} events via fallback`);
            return this.processSuggestions(tenantId, userId, startOfDay, endOfDay, fallbackEvents || []);
        }

        this.logger.log(`Found ${calendarEvents?.length || 0} calendar events`);

        if (!calendarEvents || calendarEvents.length === 0) {
            return [];
        }

        return this.processSuggestions(tenantId, userId, startOfDay, endOfDay, calendarEvents);
    }

    private async processSuggestions(tenantId: string, userId: string, startOfDay: Date, endOfDay: Date, calendarEvents: any[]) {

        // 2. Get Employee ID for this user
        let { data: employee, error: empError } = await this.supabase.getAdminClient()
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
            // Get user info from auth to make it better (optional, but let's just use defaults for now)
            const { data: { user } } = await this.supabase.getAdminClient().auth.admin.getUserById(userId);

            const { data: newEmp, error: createError } = await this.supabase.getAdminClient()
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

        // 3. Get Existing Time Entries (to exclude already converted)
        const { data: existingEntries } = await this.supabase.getAdminClient()
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
            startTime: event.start_at,
            endTime: event.end_at,
            durationMinutes: Math.round((new Date(event.end_at).getTime() - new Date(event.start_at).getTime()) / 60000),
            provider: event.provider
        }));
    }

    async update(id: string, updateTimeEntryDto: UpdateTimeEntryDto, userId: string) {
        const updateData: any = {
            updated_by_user_id: userId
        };

        if (updateTimeEntryDto.description !== undefined) updateData.description = updateTimeEntryDto.description;
        if (updateTimeEntryDto.startTime) updateData.start_time = new Date(updateTimeEntryDto.startTime).toISOString();
        if (updateTimeEntryDto.endTime) updateData.end_time = new Date(updateTimeEntryDto.endTime).toISOString();
        if (updateTimeEntryDto.durationMinutes) updateData.minutes = updateTimeEntryDto.durationMinutes;

        const { data, error } = await this.supabase.getAdminClient()
            .from('time_entries')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update time entry: ${error.message}`);
        return data;
    }

    async remove(id: string) {
        const { error } = await this.supabase.getAdminClient()
            .from('time_entries')
            .delete()
            .eq('id', id);

        if (error) throw new Error(`Failed to delete time entry: ${error.message}`);
        return { success: true };
    }
}
