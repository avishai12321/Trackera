import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../shared/supabase.service';
import * as XLSX from 'xlsx';

interface UploadedFile {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}

export interface ImportResult {
    employeesCreated: number;
    clientsCreated: number;
    projectsCreated: number;
    timeEntriesCreated: number;
    errors: string[];
    warnings: string[];
}

@Injectable()
export class ImportService {
    private readonly logger = new Logger(ImportService.name);

    constructor(private supabase: SupabaseService) { }

    async importExcel(file: UploadedFile, tenantId: string): Promise<ImportResult> {
        this.logger.log(`Starting Excel import for tenant: ${tenantId}`);
        this.logger.log(`File info: ${file.originalname}, size: ${file.size} bytes, buffer length: ${file.buffer?.length || 0}`);

        // Validate file buffer
        if (!file.buffer || file.buffer.length === 0) {
            throw new Error('File buffer is empty. Please ensure the file was uploaded correctly.');
        }

        // Parse Excel workbook
        let workbook: XLSX.WorkBook;
        try {
            workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
        } catch (error: any) {
            this.logger.error(`Failed to parse Excel file: ${error.message}`);
            throw new Error(`Failed to parse Excel file: ${error.message}. Please ensure the file is a valid Excel file.`);
        }

        this.logger.log(`Workbook sheets: ${workbook.SheetNames.join(', ')}`);

        // Find sheets by name (case-insensitive) or fall back to index
        const employeesSheet = this.findSheet(workbook, ['employees', 'עובדים'], 0);
        const customersSheet = this.findSheet(workbook, ['customers', 'לקוחות', 'clients'], 1);
        const projectsSheet = this.findSheet(workbook, ['projects', 'פרויקטים'], 2);
        const timeEntriesSheet = this.findSheet(workbook, ['time_entries_import', 'time_entries', 'time entries', 'דיווחי שעות'], 3);

        // Convert to JSON
        const employeesData = employeesSheet ? XLSX.utils.sheet_to_json(employeesSheet) : [];
        const customersData = customersSheet ? XLSX.utils.sheet_to_json(customersSheet) : [];
        const projectsData = projectsSheet ? XLSX.utils.sheet_to_json(projectsSheet) : [];
        const timeEntriesData = timeEntriesSheet ? XLSX.utils.sheet_to_json(timeEntriesSheet) : [];

        this.logger.log(`Parsed data counts - Employees: ${employeesData.length}, Customers: ${customersData.length}, Projects: ${projectsData.length}, Time Entries: ${timeEntriesData.length}`);

        // Process in correct order with lookups
        return this.processImport(tenantId, employeesData, customersData, projectsData, timeEntriesData);
    }

    private findSheet(workbook: XLSX.WorkBook, names: string[], fallbackIndex: number): XLSX.WorkSheet | null {
        // Try to find by name (case-insensitive)
        for (const name of names) {
            const sheetName = workbook.SheetNames.find(
                sn => sn.toLowerCase() === name.toLowerCase()
            );
            if (sheetName) {
                return workbook.Sheets[sheetName];
            }
        }
        // Fall back to index
        if (fallbackIndex < workbook.SheetNames.length) {
            return workbook.Sheets[workbook.SheetNames[fallbackIndex]];
        }
        return null;
    }

    private async processImport(
        tenantId: string,
        employees: any[],
        customers: any[],
        projects: any[],
        timeEntries: any[]
    ): Promise<ImportResult> {
        const client = this.supabase.getClientForTenant(tenantId);
        const errors: string[] = [];
        const warnings: string[] = [];

        // Maps for lookups (key normalized to lowercase for matching)
        const employeeNameToId = new Map<string, string>();
        const clientNameToId = new Map<string, string>();
        const projectKeyToId = new Map<string, string>();

        // Track first and last report dates per employee
        const employeeReportDates = new Map<string, { firstDate: string | null; lastDate: string | null }>();

        // STEP 1: Create Clients first (no dependencies)
        let clientsCreated = 0;
        for (const row of customers) {
            try {
                const name = this.getColumnValue(row, ['name', 'customer', 'Name', 'Customer', 'שם', 'לקוח']);
                if (!name) {
                    warnings.push(`Skipping customer row: missing name`);
                    continue;
                }

                // Check if client already exists
                const { data: existingClient } = await client
                    .from('clients')
                    .select('id, name')
                    .eq('tenant_id', tenantId)
                    .eq('name', name.trim())
                    .single();

                if (existingClient) {
                    clientNameToId.set(name.toLowerCase().trim(), existingClient.id);
                    warnings.push(`Client "${name}" already exists, using existing record`);
                    continue;
                }

                const { data, error } = await client
                    .from('clients')
                    .insert({
                        tenant_id: tenantId,
                        name: name.trim(),
                        status: 'ACTIVE'
                    })
                    .select('id, name')
                    .single();

                if (error) throw error;
                clientNameToId.set(name.toLowerCase().trim(), data.id);
                clientsCreated++;
                this.logger.log(`Created client: ${data.name} -> ${data.id}`);
            } catch (err: any) {
                errors.push(`Client "${this.getColumnValue(row, ['name', 'customer'])}": ${err.message}`);
            }
        }

        // STEP 2: Create Employees (no dependencies)
        let employeesCreated = 0;
        for (const row of employees) {
            try {
                const fullName = this.getColumnValue(row, ['name', 'employee', 'Name', 'Employee', 'שם', 'עובד']);
                if (!fullName) {
                    warnings.push(`Skipping employee row: missing name`);
                    continue;
                }

                const { firstName, lastName } = this.parseFullName(fullName);
                const hireDate = this.parseDate(this.getColumnValue(row, ['hire_date', 'hireDate', 'start_date', 'תאריך התחלה']));
                const firstReportDate = this.parseDate(this.getColumnValue(row, ['first_report_date', 'firstReportDate', 'תאריך דיווח ראשון']));
                const lastReportDate = this.parseDate(this.getColumnValue(row, ['last_report_date', 'lastReportDate', 'תאריך דיווח אחרון']));

                // Check if employee already exists
                const { data: existingEmployee } = await client
                    .from('employees')
                    .select('id, first_name, last_name')
                    .eq('tenant_id', tenantId)
                    .eq('first_name', firstName)
                    .eq('last_name', lastName)
                    .single();

                if (existingEmployee) {
                    employeeNameToId.set(fullName.toLowerCase().trim(), existingEmployee.id);
                    warnings.push(`Employee "${fullName}" already exists, using existing record`);
                    continue;
                }

                const { data, error } = await client
                    .from('employees')
                    .insert({
                        tenant_id: tenantId,
                        first_name: firstName,
                        last_name: lastName,
                        hire_date: hireDate,
                        first_report_date: firstReportDate,
                        last_report_date: lastReportDate,
                        status: 'ACTIVE'
                    })
                    .select('id, first_name, last_name')
                    .single();

                if (error) throw error;
                employeeNameToId.set(fullName.toLowerCase().trim(), data.id);
                employeesCreated++;
                this.logger.log(`Created employee: ${data.first_name} ${data.last_name} -> ${data.id}`);
            } catch (err: any) {
                errors.push(`Employee "${this.getColumnValue(row, ['name', 'employee'])}": ${err.message}`);
            }
        }

        // STEP 3: Create Projects (depends on clients)
        let projectsCreated = 0;
        for (const row of projects) {
            try {
                const customerName = this.getColumnValue(row, ['customer', 'customerName', 'customer_name', 'Customer', 'לקוח']);
                const projectName = this.getColumnValue(row, ['project', 'projectName', 'project_name', 'name', 'Project', 'Name', 'פרויקט', 'שם']);
                const projectKey = this.getColumnValue(row, ['project_key', 'projectKey', 'key', 'code', 'Code', 'מפתח']);

                if (!projectName) {
                    warnings.push(`Skipping project row: missing name`);
                    continue;
                }

                // Look up client_id if customer name provided
                let clientId: string | null = null;
                if (customerName) {
                    clientId = clientNameToId.get(customerName.toLowerCase().trim()) || null;
                    if (!clientId) {
                        warnings.push(`Project "${projectName}": Client "${customerName}" not found in imported clients`);
                    }
                }

                // Check if project already exists (by name and optional code)
                let existingProjectQuery = client
                    .from('projects')
                    .select('id, name, code')
                    .eq('tenant_id', tenantId)
                    .eq('name', projectName.trim());

                if (projectKey) {
                    existingProjectQuery = existingProjectQuery.eq('code', projectKey.trim());
                }

                const { data: existingProject } = await existingProjectQuery.single();

                if (existingProject) {
                    // Map by project key for time entry lookups
                    if (projectKey) {
                        projectKeyToId.set(projectKey.toLowerCase().trim(), existingProject.id);
                    }
                    // Also map by full "customer | project" key if available
                    if (customerName && projectName) {
                        const fullKey = `${customerName.trim()} | ${projectName.trim()}`.toLowerCase();
                        projectKeyToId.set(fullKey, existingProject.id);
                    }
                    warnings.push(`Project "${projectName}" already exists, using existing record`);
                    continue;
                }

                const { data, error } = await client
                    .from('projects')
                    .insert({
                        tenant_id: tenantId,
                        name: projectName.trim(),
                        code: projectKey ? projectKey.trim() : null,
                        client_id: clientId,
                        status: 'ACTIVE'
                    })
                    .select('id, name, code')
                    .single();

                if (error) throw error;

                // Map by project key for time entry lookups
                if (projectKey) {
                    projectKeyToId.set(projectKey.toLowerCase().trim(), data.id);
                }
                // Also map by full "customer | project" key if available
                if (customerName && projectName) {
                    const fullKey = `${customerName.trim()} | ${projectName.trim()}`.toLowerCase();
                    projectKeyToId.set(fullKey, data.id);
                }

                projectsCreated++;
                this.logger.log(`Created project: ${data.name} (${data.code}) -> ${data.id}`);
            } catch (err: any) {
                errors.push(`Project "${this.getColumnValue(row, ['project', 'name'])}": ${err.message}`);
            }
        }

        // STEP 4: Create Time Entries (depends on employees and projects)
        let timeEntriesCreated = 0;
        for (const row of timeEntries) {
            try {
                const employeeName = this.getColumnValue(row, ['employee', 'employeeName', 'employee_name', 'Employee', 'עובד']);
                const projectKey = this.getColumnValue(row, ['project_key', 'projectKey', 'project_id', 'project', 'Project', 'פרויקט']);
                const dateRaw = this.getColumnValue(row, ['date', 'Date', 'תאריך']);
                const date = this.parseDate(dateRaw);

                this.logger.debug(`Time entry date parsing: raw=${JSON.stringify(dateRaw)}, parsed=${date}`);

                if (!date) {
                    errors.push(`Time entry: missing or invalid date (raw value: ${JSON.stringify(dateRaw)})`);
                    continue;
                }

                // Look up employee_id
                let employeeId: string | null = null;
                if (employeeName) {
                    employeeId = employeeNameToId.get(employeeName.toLowerCase().trim()) || null;
                }
                if (!employeeId) {
                    errors.push(`Time entry on ${date}: Employee "${employeeName}" not found`);
                    continue;
                }

                // Look up project_id
                let projectId: string | null = null;
                if (projectKey) {
                    projectId = projectKeyToId.get(projectKey.toLowerCase().trim()) || null;
                }
                if (!projectId) {
                    errors.push(`Time entry on ${date}: Project "${projectKey}" not found`);
                    continue;
                }

                // Parse hours and minutes
                const hours = this.parseNumber(this.getColumnValue(row, ['hours', 'Hours', 'שעות'])) || 0;
                const minutes = this.parseNumber(this.getColumnValue(row, ['minutes', 'Minutes', 'דקות'])) || 0;
                const totalMinutes = Math.round(hours * 60 + minutes);

                if (totalMinutes <= 0) {
                    warnings.push(`Time entry on ${date}: Zero duration, skipping`);
                    continue;
                }

                const description = this.getColumnValue(row, ['description', 'Description', 'תיאור']) || '';
                const startTimeRaw = this.parseTime(this.getColumnValue(row, ['start_time', 'startTime', 'from', 'משעה']));
                const endTimeRaw = this.parseTime(this.getColumnValue(row, ['end_time', 'endTime', 'to', 'עד']));
                const billable = this.getColumnValue(row, ['billable', 'Billable']);

                // If no start_time is provided, use midnight (00:00:00) as default
                // This allows time entries with just date + duration
                const startTime = startTimeRaw || '00:00:00';
                const endTime = endTimeRaw || null;

                this.logger.debug(`Time entry: date=${date}, startTime=${startTime}, endTime=${endTime}, minutes=${totalMinutes}`);

                const { error } = await client
                    .from('time_entries')
                    .insert({
                        tenant_id: tenantId,
                        employee_id: employeeId,
                        project_id: projectId,
                        date: date,
                        start_time: startTime,
                        end_time: endTime,
                        minutes: totalMinutes,
                        hours: totalMinutes / 60,
                        description: description,
                        source: 'IMPORT',
                        billable: billable !== false && billable !== 'false' && billable !== 0
                    });

                if (error) throw error;
                timeEntriesCreated++;

                // Track first and last report dates for this employee
                if (employeeId && date) {
                    const existing = employeeReportDates.get(employeeId);
                    if (!existing) {
                        employeeReportDates.set(employeeId, { firstDate: date, lastDate: date });
                    } else {
                        // Update first date if this date is earlier
                        if (!existing.firstDate || date < existing.firstDate) {
                            existing.firstDate = date;
                        }
                        // Update last date if this date is later
                        if (!existing.lastDate || date > existing.lastDate) {
                            existing.lastDate = date;
                        }
                    }
                }
            } catch (err: any) {
                errors.push(`Time entry: ${err.message}`);
            }
        }

        // STEP 5: Update employees with first and last report dates
        for (const [employeeId, dates] of employeeReportDates.entries()) {
            try {
                const { error } = await client
                    .from('employees')
                    .update({
                        first_report_date: dates.firstDate,
                        last_report_date: dates.lastDate
                    })
                    .eq('id', employeeId)
                    .eq('tenant_id', tenantId);

                if (error) throw error;
                this.logger.log(`Updated report dates for employee ${employeeId}: ${dates.firstDate} to ${dates.lastDate}`);
            } catch (err: any) {
                warnings.push(`Failed to update report dates for employee ${employeeId}: ${err.message}`);
            }
        }

        this.logger.log(`Import complete - Clients: ${clientsCreated}, Employees: ${employeesCreated}, Projects: ${projectsCreated}, Time Entries: ${timeEntriesCreated}`);
        this.logger.log(`Warnings: ${warnings.length}, Errors: ${errors.length}`);

        return {
            employeesCreated,
            clientsCreated,
            projectsCreated,
            timeEntriesCreated,
            errors,
            warnings
        };
    }

    private getColumnValue(row: any, possibleNames: string[]): any {
        for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                return row[name];
            }
        }
        return null;
    }

    private parseFullName(fullName: string): { firstName: string; lastName: string } {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) {
            return { firstName: parts[0], lastName: '' };
        }
        return {
            firstName: parts[0],
            lastName: parts.slice(1).join(' ')
        };
    }

    private parseDate(value: any): string | null {
        if (!value) return null;

        this.logger.debug(`parseDate: type=${typeof value}, value=${value}, isDate=${value instanceof Date}`);

        // If it's already a Date object (cellDates: true)
        if (value instanceof Date) {
            if (isNaN(value.getTime())) {
                this.logger.warn(`parseDate: Invalid Date object`);
                return null;
            }
            const result = value.toISOString().split('T')[0];
            this.logger.debug(`parseDate: Date object converted to ${result}`);
            return result;
        }

        // If it's a string, try to parse
        if (typeof value === 'string') {
            const trimmed = value.trim();

            // Try ISO format first (YYYY-MM-DD)
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                return trimmed;
            }

            // Try parsing as date string
            const isoDate = new Date(trimmed);
            if (!isNaN(isoDate.getTime())) {
                return isoDate.toISOString().split('T')[0];
            }

            // Try DD/MM/YYYY format (common in Hebrew/European locales)
            const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
            if (ddmmyyyy) {
                const [, day, month, year] = ddmmyyyy;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            // Try MM/DD/YYYY format (US format)
            const mmddyyyy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
            if (mmddyyyy) {
                const [, month, day, year] = mmddyyyy;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }

        // If it's an Excel serial date number
        if (typeof value === 'number') {
            try {
                const excelDate = XLSX.SSF.parse_date_code(value);
                if (excelDate && excelDate.y && excelDate.m && excelDate.d) {
                    return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
                }
            } catch (err) {
                this.logger.warn(`parseDate: Failed to parse Excel date number ${value}`);
            }
        }

        this.logger.warn(`parseDate: Could not parse value: ${JSON.stringify(value)}`);
        return null;
    }

    private parseTime(value: any): string | null {
        if (!value) return null;

        // If it's already a time string HH:MM
        if (typeof value === 'string') {
            const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
            if (timeMatch) {
                const [, h, m] = timeMatch;
                return `${h.padStart(2, '0')}:${m}:00`;
            }
        }

        // If it's a Date object (with time component)
        if (value instanceof Date) {
            const h = value.getHours().toString().padStart(2, '0');
            const m = value.getMinutes().toString().padStart(2, '0');
            return `${h}:${m}:00`;
        }

        // If it's an Excel time fraction (e.g., 0.5 = 12:00)
        if (typeof value === 'number' && value >= 0 && value < 1) {
            const totalMinutes = Math.round(value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        }

        return null;
    }

    private parseNumber(value: any): number | null {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }
}
