'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { supabase, getCompanySchema } from '@/lib/supabase';
import { DateFilterProvider, useDateFilter } from '@/contexts/DateFilterContext';
import { DateRangePicker } from '@/components/DateRangePicker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];


type TabType = 'company' | 'project' | 'employee-overview' | 'employee-deep-dive';

export default function Dashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('company');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        checkAuth();
    }, [router]);

    async function checkAuth() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setLoading(false);
        } catch (err) {
            console.error('Auth error:', err);
            router.push('/login');
        }
    }

    const tabs = [
        { id: 'company' as TabType, label: 'Company Overview', icon: '🏢' },
        { id: 'project' as TabType, label: 'Project View', icon: '📊' },
        { id: 'employee-overview' as TabType, label: 'Employee Overview', icon: '👥' },
        { id: 'employee-deep-dive' as TabType, label: 'Employee Deep Dive', icon: '🔍' }
    ];

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DateFilterProvider>
            <DashboardLayout>
                <div style={{ marginBottom: '2rem' }}>
                    <h1>Analytics Dashboard</h1>
                    <p style={{ color: '#64748b' }}>Comprehensive insights across company, projects, and employees</p>
                </div>

                {/* Date Range Picker */}
                <DateRangePicker />

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    borderBottom: '2px solid #e2e8f0',
                    marginBottom: '2rem',
                    overflow: 'auto'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '1rem 1.5rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '3px solid #6366f1' : '3px solid transparent',
                                color: activeTab === tab.id ? '#6366f1' : '#64748b',
                                fontWeight: activeTab === tab.id ? '600' : '400',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.95rem',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'company' && <CompanyOverviewTab />}
                {activeTab === 'project' && <ProjectViewTab />}
                {activeTab === 'employee-overview' && <EmployeeOverviewTab />}
                {activeTab === 'employee-deep-dive' && <EmployeeDeepDiveTab />}
            </DashboardLayout>
        </DateFilterProvider>
    );
}

// ============================================
// TAB 1: COMPANY OVERVIEW
// ============================================
function CompanyOverviewTab() {
    const { dateFilter, isLoading: isDateLoading } = useDateFilter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        projects: 0,
        employees: 0,
        capacity: 0,
        income: 0
    });
    const [openProjects, setOpenProjects] = useState<any[]>([]);
    const [employeeHoursData, setEmployeeHoursData] = useState<any[]>([]);
    const [projectKeys, setProjectKeys] = useState<string[]>([]);

    useEffect(() => {
        if (isDateLoading) return; // Wait for date filter to initialize

        const fetchStats = async () => {
            setLoading(true);
            try {
                const schema = await getCompanySchema();

                // Get projects count
                const { count: projectsCount } = await supabase
                    .schema(schema)
                    .from('projects')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'ACTIVE');

                // Get employees count
                const { count: employeesCount } = await supabase
                    .schema(schema)
                    .from('employees')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'ACTIVE');

                // Get employees for chart
                const { data: employees } = await supabase
                    .schema(schema)
                    .from('employees')
                    .select('id, first_name, last_name')
                    .eq('status', 'ACTIVE');

                // Get projects with details for open projects list
                const { data: projects } = await supabase
                    .schema(schema)
                    .from('projects')
                    .select('id, name, total_budget, estimated_hours')
                    .eq('status', 'ACTIVE');

                // Get time entries filtered by date range for actual hours
                const { data: timeEntries } = await supabase
                    .schema(schema)
                    .from('time_entries')
                    .select('project_id, employee_id, minutes')
                    .gte('date', dateFilter.startDate)
                    .lte('date', dateFilter.endDate);

                // Get time allocations to calculate planned hours
                const { data: allocations } = await supabase
                    .schema(schema)
                    .from('time_allocations')
                    .select('project_id, employee_id, allocated_hours');

                if (projects) {
                    const totalIncome = projects.reduce((sum, p) => sum + (p.total_budget || 0), 0);

                    // Calculate execution rate for each project (actual hours / planned hours)
                    const projectsWithRates = projects.map(p => {
                        const plannedHours = allocations?.filter((a: any) => a.project_id === p.id)
                            .reduce((sum: number, a: any) => sum + (a.allocated_hours || 0), 0) || 0;
                        const actualMinutes = timeEntries?.filter((e: any) => e.project_id === p.id)
                            .reduce((sum: number, e: any) => sum + (e.minutes || 0), 0) || 0;
                        const actualHours = actualMinutes / 60;
                        const executionRate = plannedHours > 0 ? Math.round((actualHours / plannedHours) * 100) : 0;
                        return {
                            ...p,
                            executionRate: Math.min(executionRate, 100) // Cap at 100%
                        };
                    });
                    setOpenProjects(projectsWithRates);

                    // Build stacked bar chart data: actual hours per project per employee
                    if (employees && timeEntries) {
                        const projectNames = projects.map(p => p.name);
                        setProjectKeys(projectNames);

                        const chartData = employees.map(emp => {
                            const empData: any = { name: `${emp.first_name}` };
                            projects.forEach(proj => {
                                const projEntries = timeEntries?.filter(
                                    (e: any) => e.employee_id === emp.id && e.project_id === proj.id
                                ) || [];
                                const totalMinutes = projEntries.reduce((sum: number, e: any) => sum + (e.minutes || 0), 0);
                                empData[proj.name] = Math.round(totalMinutes / 60); // Convert to hours
                            });
                            return empData;
                        });
                        setEmployeeHoursData(chartData);
                    }

                    // Calculate capacity (total allocated / total available)
                    const totalAllocated = allocations?.reduce((sum: number, a: any) => sum + (a.allocated_hours || 0), 0) || 0;
                    const totalCapacity = (employeesCount || 0) * 160; // 160 hrs/month per employee
                    const capacityPercent = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

                    setStats({
                        projects: projectsCount || 0,
                        employees: employeesCount || 0,
                        capacity: capacityPercent || 77,
                        income: totalIncome
                    });
                }
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [dateFilter.startDate, dateFilter.endDate, isDateLoading]);

    // Color for execution rate
    const getExecutionColor = (rate: number) => {
        if (rate >= 85) return { bg: '#dcfce7', color: '#166534' }; // Green
        if (rate >= 65) return { bg: '#fef9c3', color: '#854d0e' }; // Yellow
        return { bg: '#fee2e2', color: '#991b1b' }; // Red
    };

    // Colors for stacked bars
    const STACK_COLORS = ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764'];

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <div>Loading company overview data...</div>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Company Overview</h2>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <MetricCard title="Total Open Projected Income" value={`$${stats.income.toLocaleString()}`} />
                <MetricCard title="Total Open Projects" value={stats.projects.toString()} />
                <MetricCard title="Number of Employees" value={stats.employees.toString()} />
                <MetricCard title="Company Capacity" value={`${stats.capacity}%`} />
            </div>

            {/* Main Content: Open Projects List + Hours Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>

                {/* Open Projects List with Execution Rates */}
                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Open Projects</h3>
                    {openProjects.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {openProjects.map((proj, idx) => {
                                const colors = getExecutionColor(proj.executionRate);
                                return (
                                    <div
                                        key={proj.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            background: '#f8fafc',
                                            borderRadius: '6px',
                                            borderLeft: `4px solid ${STACK_COLORS[idx % STACK_COLORS.length]}`
                                        }}
                                    >
                                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{proj.name}</span>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            background: colors.bg,
                                            color: colors.color
                                        }}>
                                            {proj.executionRate}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            No open projects
                        </div>
                    )}
                </div>

                {/* Hours per Project per Employee - Stacked Bar Chart */}
                <div className="card" style={{ height: '400px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Hours per Project per Employee</h3>
                    {employeeHoursData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart
                                data={employeeHoursData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                {projectKeys.map((key, idx) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        stackId="a"
                                        fill={STACK_COLORS[idx % STACK_COLORS.length]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                            No allocation data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// TAB 2: PROJECT VIEW
// ============================================
function ProjectViewTab() {
    const { dateFilter, isLoading: isDateLoading } = useDateFilter();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [projectStats, setProjectStats] = useState<any>(null);
    const [workDistribution, setWorkDistribution] = useState<any[]>([]);
    const [monthlyProgress, setMonthlyProgress] = useState<any[]>([]);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        if (isDateLoading) return;

        if (selectedProjectId) {
            loadProjectDetails(selectedProjectId);
        } else {
            setProjectStats(null);
            setWorkDistribution([]);
            setMonthlyProgress([]);
        }
    }, [selectedProjectId, dateFilter.startDate, dateFilter.endDate, isDateLoading]);

    const loadProjects = async () => {
        try {
            const schema = await getCompanySchema();
            const { data } = await supabase
                .schema(schema)
                .from('projects')
                .select('id, name')
                .order('name');

            if (data) setProjects(data);
        } catch (err) {
            console.error('Error loading projects:', err);
        }
    };

    const loadProjectDetails = async (projectId: string) => {
        setLoading(true);
        try {
            const schema = await getCompanySchema();

            // 1. Get Project Info
            const { data: project } = await supabase
                .schema(schema)
                .from('projects')
                .select(`
                    *,
                    client:client_id(name),
                    manager:manager_id(first_name, last_name)
                `)
                .eq('id', projectId)
                .single();

            if (project) {
                setProjectStats(project);
            }

            // 2. Get Work Distribution (actual hours per employee filtered by date range)
            const { data: timeEntries } = await supabase
                .schema(schema)
                .from('time_entries')
                .select(`
                    minutes,
                    employee:employee_id(first_name, last_name)
                `)
                .eq('project_id', projectId)
                .gte('date', dateFilter.startDate)
                .lte('date', dateFilter.endDate);

            if (timeEntries) {
                const distMap = new Map();
                timeEntries.forEach((entry: any) => {
                    const name = `${entry.employee?.first_name} ${entry.employee?.last_name}`;
                    const current = distMap.get(name) || 0;
                    distMap.set(name, current + (entry.minutes / 60)); // Convert to hours
                });

                const distData = Array.from(distMap.entries()).map(([name, value]) => ({
                    name,
                    value: Math.round(value * 10) / 10 // Round to 1 decimal
                }));
                setWorkDistribution(distData);
            }

            // 3. Get monthly progress (planned vs actual) by grouping time entries by month
            const { data: allEntries } = await supabase
                .schema(schema)
                .from('time_entries')
                .select('date, minutes')
                .eq('project_id', projectId)
                .gte('date', dateFilter.startDate)
                .lte('date', dateFilter.endDate)
                .order('date');

            const { data: allocations } = await supabase
                .schema(schema)
                .from('time_allocations')
                .select('allocated_hours, year, month')
                .eq('project_id', projectId);

            // Group by month
            const monthlyMap = new Map();
            allEntries?.forEach((entry: any) => {
                const monthKey = entry.date.substring(0, 7); // YYYY-MM
                const current = monthlyMap.get(monthKey) || 0;
                monthlyMap.set(monthKey, current + (entry.minutes / 60));
            });

            // Build progress data
            const progressData = Array.from(monthlyMap.entries()).map(([monthKey, actual]) => {
                const [year, month] = monthKey.split('-').map(Number);
                const planned = allocations?.find((a: any) => a.year === year && a.month === month)?.allocated_hours || 0;
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return {
                    name: monthNames[month - 1],
                    planned,
                    actual: Math.round(actual)
                };
            });
            setMonthlyProgress(progressData);

        } catch (err) {
            console.error('Error loading project details:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Project View</h2>

            {/* Project Selector */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Project</label>
                <select
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '1rem'
                    }}
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                    <option value="">Select a project...</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {selectedProjectId && projectStats ? (
                <>
                    {/* Project Info Card */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h3>Project Information</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            <InfoItem label="Project Name" value={projectStats.name} />
                            <InfoItem label="Customer" value={projectStats.client?.name || 'N/A'} />
                            <InfoItem label="Project Manager" value={`${projectStats.manager?.first_name || ''} ${projectStats.manager?.last_name || ''}`} />
                            <InfoItem label="Total Budget" value={`$${projectStats.total_budget?.toLocaleString() || '0'}`} />
                            <InfoItem label="Budget Type" value={projectStats.budget_type || 'Fixed'} />
                            <InfoItem label="Status" value={projectStats.status} />
                        </div>
                    </div>

                    {/* Visual Slots */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

                        {/* Chart 1: Work Distribution */}
                        <div className="card" style={{ height: '400px' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Work Distribution (Planned Hours)</h3>
                            {workDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={workDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {workDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                                    No team allocations found
                                </div>
                            )}
                        </div>

                        {/* Chart 2: Planned vs Actual */}
                        <div className="card" style={{ height: '400px' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Planned vs Actual (Last 6 Months)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={monthlyProgress}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar dataKey="planned" fill="#8884d8" name="Planned Hours" />
                                    <Bar dataKey="actual" fill="#82ca9d" name="Actual Hours" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    Please select a project to view details
                </div>
            )}
        </div>
    );
}

// ============================================
// TAB 3: EMPLOYEE OVERVIEW
// ============================================
function EmployeeOverviewTab() {
    const { dateFilter, isLoading: isDateLoading } = useDateFilter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isDateLoading) return;
        loadEmployees();
    }, [dateFilter.startDate, dateFilter.endDate, isDateLoading]);

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const schema = await getCompanySchema();

            // 1. Get Employees
            const { data: employeesData } = await supabase
                .schema(schema)
                .from('employees')
                .select('*')
                .eq('status', 'ACTIVE')
                .order('first_name');

            if (employeesData) {
                // 2. Get time entries filtered by date range for actual hours
                const { data: timeEntries } = await supabase
                    .schema(schema)
                    .from('time_entries')
                    .select('employee_id, project_id, minutes, project:project_id(name)')
                    .gte('date', dateFilter.startDate)
                    .lte('date', dateFilter.endDate);

                // Map time entries to employees
                const enhancedEmployees = employeesData.map(emp => {
                    const empEntries = timeEntries?.filter((e: any) => e.employee_id === emp.id) || [];
                    const projectNames = Array.from(new Set(empEntries.map((e: any) => e.project?.name).filter(Boolean))).join(', ');
                    const totalMinutes = empEntries.reduce((sum: number, e: any) => sum + (e.minutes || 0), 0);
                    const totalHours = Math.round(totalMinutes / 60);

                    return {
                        ...emp,
                        currentProjects: projectNames || 'None',
                        monthlyPlanned: totalHours,
                        lastReport: 'N/A' // Placeholder
                    };
                });

                setEmployees(enhancedEmployees);
            }
        } catch (err) {
            console.error('Error loading employees:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Employee Overview</h2>

            {/* Employee Table */}
            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee Name</th>
                                <th>Position</th>
                                <th>Monthly Planned Load</th>
                                <th>Current Projects</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                            ) : employees.length > 0 ? (
                                employees.map(emp => (
                                    <tr key={emp.id}>
                                        <td>{emp.first_name} {emp.last_name}</td>
                                        <td>{emp.position || '-'}</td>
                                        <td>{emp.monthlyPlanned} hrs</td>
                                        <td>{emp.currentProjects}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        No active employees found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <div className="card" style={{ height: '400px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Hours Distribution per Employee</h3>
                    {employees.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={employees}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="first_name" />
                                <YAxis />
                                <RechartsTooltip
                                    formatter={(value: any) => [`${value} hrs`, 'Planned Hours']}
                                />
                                <Legend />
                                <Bar dataKey="monthlyPlanned" fill="#8884d8" name="Planned Load" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                            No data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// TAB 4: EMPLOYEE DEEP DIVE
// ============================================
function EmployeeDeepDiveTab() {
    const { dateFilter, isLoading: isDateLoading } = useDateFilter();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmpId, setSelectedEmpId] = useState<string>('');
    const [empStats, setEmpStats] = useState<any>(null);
    const [workloadData, setWorkloadData] = useState<any[]>([]);

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        if (isDateLoading) return;

        if (selectedEmpId) {
            loadEmployeeDetails(selectedEmpId);
        } else {
            setEmpStats(null);
            setWorkloadData([]);
        }
    }, [selectedEmpId, dateFilter.startDate, dateFilter.endDate, isDateLoading]);

    const loadEmployees = async () => {
        try {
            const schema = await getCompanySchema();
            const { data } = await supabase
                .schema(schema)
                .from('employees')
                .select('id, first_name, last_name')
                .eq('status', 'ACTIVE')
                .order('first_name');

            if (data) setEmployees(data);
        } catch (err) {
            console.error('Error loading employees:', err);
        }
    };

    const loadEmployeeDetails = async (empId: string) => {
        setLoading(true);
        try {
            const schema = await getCompanySchema();

            // 1. Get Employee Profile
            const { data: emp } = await supabase
                .schema(schema)
                .from('employees')
                .select('*')
                .eq('id', empId)
                .single();

            if (emp) {
                // 2. Get time entries filtered by date range for actual workload
                const { data: timeEntries } = await supabase
                    .schema(schema)
                    .from('time_entries')
                    .select('minutes, project:project_id(name)')
                    .eq('employee_id', empId)
                    .gte('date', dateFilter.startDate)
                    .lte('date', dateFilter.endDate);

                // 3. Get allocations for planned hours (for metrics calculation)
                const { data: allocations } = await supabase
                    .schema(schema)
                    .from('time_allocations')
                    .select('allocated_hours, project_id')
                    .eq('employee_id', empId);

                const projectSet = new Set(timeEntries?.map((e: any) => e.project?.name).filter(Boolean));
                const projectCount = projectSet.size;

                // Calculate metrics
                const totalActualMinutes = timeEntries?.reduce((sum: number, e: any) => sum + (e.minutes || 0), 0) || 0;
                const totalActualHours = totalActualMinutes / 60;
                const totalPlannedHours = allocations?.reduce((sum: number, a: any) => sum + (a.allocated_hours || 0), 0) || 0;
                const executionRate = totalPlannedHours > 0 ? Math.round((totalActualHours / totalPlannedHours) * 100) : 0;
                const monthlyCapacity = emp.monthly_capacity || 160;
                const occupancy = Math.round((totalActualHours / monthlyCapacity) * 100);

                setEmpStats({
                    ...emp,
                    projectCount,
                    successRate: '95%', // Placeholder - would need quality/completion data
                    occupancy: `${Math.min(occupancy, 100)}%`,
                    executionRate: `${Math.min(executionRate, 100)}%`
                });

                // Build workload distribution by project
                if (timeEntries) {
                    const projectMap = new Map();
                    timeEntries.forEach((entry: any) => {
                        const projectName = entry.project?.name || 'Unknown';
                        const current = projectMap.get(projectName) || 0;
                        projectMap.set(projectName, current + (entry.minutes / 60));
                    });

                    const data = Array.from(projectMap.entries()).map(([name, hours]) => ({
                        name,
                        hours: Math.round(hours as number)
                    }));
                    setWorkloadData(data);
                }
            }
        } catch (err) {
            console.error('Error loading employee details:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Employee Deep Dive</h2>

            {/* Employee Selector */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Employee</label>
                <select
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '1rem'
                    }}
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                >
                    <option value="">Select an employee...</option>
                    {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                    ))}
                </select>
            </div>

            {selectedEmpId && empStats ? (
                <>
                    {/* Employee Profile Card */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h3>Employee Profile</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            <InfoItem label="Name" value={`${empStats.first_name} ${empStats.last_name}`} />
                            <InfoItem label="Position" value={empStats.position || '-'} />
                            <InfoItem label="Level" value={empStats.level || '-'} />
                            <InfoItem label="Department" value={empStats.department || '-'} />
                            <InfoItem label="Number of Projects" value={empStats.projectCount.toString()} />
                            <InfoItem label="Email" value={empStats.email || '-'} />
                        </div>
                    </div>

                    {/* Key Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <MetricCard title="Project Success Rate" value={empStats.successRate} />
                        <MetricCard title="Avg Occupancy Level" value={empStats.occupancy} />
                        <MetricCard title="Avg Plan Execution Rate" value={empStats.executionRate} />
                    </div>

                    {/* Visual Slots */}
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="card" style={{ height: '400px' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Workload Distribution (Hours per Project)</h3>
                            {workloadData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={workloadData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Bar dataKey="hours" fill="#8884d8" name="Hours" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                                    No workload allocation data found
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    Please select an employee to view details
                </div>
            )}
        </div>
    );
}

// ============================================
// REUSABLE COMPONENTS
// ============================================
function MetricCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {title}
            </h3>
            <p style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#1e293b',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                {value}
            </p>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>{label}</div>
            <div style={{ fontWeight: '500', color: '#1e293b' }}>{value}</div>
        </div>
    );
}

function VisualPlaceholder({ title, description }: { title: string; description: string }) {
    return (
        <div className="card" style={{
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '2px dashed #cbd5e1',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
            <h3 style={{ marginBottom: '0.5rem', color: '#475569' }}>{title}</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '400px' }}>{description}</p>
            <div style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#e2e8f0',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: '500'
            }}>
                Visualization slot ready
            </div>
        </div>
    );
}
