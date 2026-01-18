import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Get authentication headers for API requests
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No authentication token found');
  }

  const companyId = session.user?.user_metadata?.company_id;

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...(companyId && { 'x-tenant-id': companyId }),
  };
}

/**
 * Generic API request handler with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If error response is not JSON, use the text
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

// ============================================================================
// Dashboard API Functions
// ============================================================================

export interface DashboardStats {
  projects: number;
  employees: number;
  capacity: number;
  income: number;
}

export interface OpenProject {
  id: string;
  name: string;
  code: string;
  status: string;
  manager_id: string;
  manager_name?: string;
  planned_hours: number;
  actual_hours: number;
  execution_rate: number;
}

export interface EmployeeHoursData {
  employee_id: string;
  employee_name: string;
  [projectName: string]: string | number; // Dynamic project columns
}

export interface CompanyOverviewResponse {
  stats: DashboardStats;
  openProjects: OpenProject[];
  employeeHoursData: EmployeeHoursData[];
  projectKeys: string[];
}

/**
 * Fetch company overview dashboard data
 */
export async function fetchCompanyOverview(
  startDate: string,
  endDate: string
): Promise<CompanyOverviewResponse> {
  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });

  return apiRequest<CompanyOverviewResponse>(
    `/dashboard/company-overview?${queryParams}`
  );
}

export interface ProjectInfo {
  id: string;
  name: string;
  code: string;
  client_name?: string;
  manager_name?: string;
  budget_type: string;
  total_budget: number;
  status: string;
  start_date: string;
  end_date?: string;
}

export interface WorkDistribution {
  employee_id: string;
  employee_name: string;
  planned_hours: number;
  actual_hours?: number;
}

export interface MonthlyProgress {
  month: string;
  planned: number;
  actual: number;
}

export interface ProjectViewResponse {
  projectInfo: ProjectInfo;
  workDistribution: WorkDistribution[];
  monthlyProgress: MonthlyProgress[];
}

/**
 * Fetch project view dashboard data
 */
export async function fetchProjectView(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<ProjectViewResponse> {
  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });

  return apiRequest<ProjectViewResponse>(
    `/dashboard/project/${projectId}?${queryParams}`
  );
}

export interface EmployeeOverviewItem {
  id: string;
  name: string;
  position: string;
  monthly_planned_load: number;
  current_projects: string[];
  total_hours: number;
}

export interface EmployeeHoursChart {
  employee_id: string;
  employee_name: string;
  hours: number;
}

export interface EmployeeOverviewResponse {
  employees: EmployeeOverviewItem[];
  employeeHoursChart: EmployeeHoursChart[];
}

/**
 * Fetch employee overview dashboard data
 */
export async function fetchEmployeeOverview(
  startDate: string,
  endDate: string
): Promise<EmployeeOverviewResponse> {
  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });

  return apiRequest<EmployeeOverviewResponse>(
    `/dashboard/employee-overview?${queryParams}`
  );
}

export interface EmployeeInfo {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  level?: string;
  department?: string;
  current_projects: string[];
}

export interface EmployeeMetrics {
  success_rate: number;
  occupancy_level: number;
  execution_rate: number;
}

export interface WorkloadDistribution {
  project_id: string;
  project_name: string;
  hours: number;
}

export interface EmployeeDeepDiveResponse {
  employeeInfo: EmployeeInfo;
  metrics: EmployeeMetrics;
  workloadDistribution: WorkloadDistribution[];
}

/**
 * Fetch employee deep dive dashboard data
 */
export async function fetchEmployeeDeepDive(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<EmployeeDeepDiveResponse> {
  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });

  return apiRequest<EmployeeDeepDiveResponse>(
    `/dashboard/employee/${employeeId}?${queryParams}`
  );
}

// ============================================================================
// Future: Additional API Functions
// ============================================================================

/**
 * Export dashboard data (future feature)
 */
export async function exportDashboardData(
  type: 'company' | 'project' | 'employee',
  startDate: string,
  endDate: string,
  format: 'csv' | 'pdf' = 'csv'
): Promise<Blob> {
  const queryParams = new URLSearchParams({
    startDate,
    endDate,
    format,
  });

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/dashboard/export/${type}?${queryParams}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return await response.blob();
}
