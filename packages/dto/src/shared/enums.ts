export enum UserStatus { ACTIVE = 'ACTIVE', DISABLED = 'DISABLED' }

export enum Role {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE',
    FINANCE_READONLY = 'FINANCE_READONLY',
}

export enum RoleScopeType { TENANT = 'TENANT', PROJECT = 'PROJECT', TEAM = 'TEAM' }

export enum ProjectStatus { ACTIVE = 'ACTIVE', ARCHIVED = 'ARCHIVED' }

export enum EmployeeStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }

export enum TimeEntrySource { MANUAL = 'MANUAL', CALENDAR_SUGGESTION = 'CALENDAR_SUGGESTION', IMPORT = 'IMPORT' }

export enum ReportType { TIME_ENTRIES_CSV = 'TIME_ENTRIES_CSV', TIME_ENTRIES_PDF = 'TIME_ENTRIES_PDF', PROJECT_SUMMARY = 'PROJECT_SUMMARY' }

export enum JobStatus { PENDING = 'PENDING', RUNNING = 'RUNNING', DONE = 'DONE', FAILED = 'FAILED' }

export enum CalendarProvider { GOOGLE = 'GOOGLE', MICROSOFT = 'MICROSOFT' }

export enum ConnectionStatus { ACTIVE = 'ACTIVE', REVOKED = 'REVOKED', ERROR = 'ERROR' }

export enum SubscriptionStatus { ACTIVE = 'ACTIVE', EXPIRED = 'EXPIRED', ERROR = 'ERROR' }

export enum ClientStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE', ARCHIVED = 'ARCHIVED' }

export enum ProjectBudgetType { FIXED = 'FIXED', HOURLY_RATE = 'HOURLY_RATE' }
