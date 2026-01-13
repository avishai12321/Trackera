'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { ClipboardList, Save, Grid3x3, FolderKanban } from 'lucide-react';
import { supabase, getCompanySchema } from '@/lib/supabase';

type ViewMode = 'overview' | 'project';

interface Project {
    id: string;
    name: string;
    code: string | null;
    budget_type: string;
    total_budget: number | null;
    hourly_rate: number | null;
    currency: string | null;
    start_date: string | null;
    end_date: string | null;
    client: { name: string } | null;
    manager: { first_name: string; last_name: string } | null;
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    monthly_capacity: number;
    hourly_rate: number | null;
}

interface MonthInfo {
    year: number;
    month: number;
    label: string;
}

interface Allocation {
    [key: string]: number; // "projectId_employeeId_year_month" -> hours
}

export default function TimeAllocation() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    // Data
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [months, setMonths] = useState<MonthInfo[]>([]);
    const [allocations, setAllocations] = useState<Allocation>({});
    const [loggedHours, setLoggedHours] = useState<{ [projectId: string]: number }>({});

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        generateMonths();
    }, [viewMode, selectedProjectId, projects]);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return router.push('/login');

            const schema = await getCompanySchema();

            // Fetch projects with relations
            const { data: projectsData, error: projectsError } = await supabase
                .schema(schema)
                .from('projects')
                .select(`
                    *,
                    client:client_id (name),
                    manager:manager_id (first_name, last_name)
                `)
                .eq('status', 'ACTIVE')
                .order('name');

            if (projectsError) throw projectsError;
            setProjects(projectsData || []);

            // Set first project as selected by default
            if (projectsData && projectsData.length > 0 && !selectedProjectId) {
                setSelectedProjectId(projectsData[0].id);
            }

            // Fetch employees
            const { data: employeesData, error: employeesError } = await supabase
                .schema(schema)
                .from('employees')
                .select('id, first_name, last_name, monthly_capacity, hourly_rate')
                .eq('status', 'ACTIVE')
                .order('first_name');

            if (employeesError) throw employeesError;
            setEmployees(employeesData || []);

            // Fetch time allocations
            const { data: allocationsData, error: allocationsError } = await supabase
                .schema(schema)
                .from('time_allocations')
                .select('project_id, employee_id, year, month, allocated_hours');

            if (allocationsError) throw allocationsError;

            // Convert to lookup object
            const allocationsMap: Allocation = {};
            allocationsData?.forEach((a: any) => {
                const key = `${a.project_id}_${a.employee_id}_${a.year}_${a.month}`;
                allocationsMap[key] = parseFloat(a.allocated_hours);
            });
            setAllocations(allocationsMap);

            // Fetch logged hours per project (from time_entries)
            const { data: timeEntriesData, error: timeEntriesError } = await supabase
                .schema(schema)
                .from('time_entries')
                .select('project_id, hours');

            if (!timeEntriesError && timeEntriesData) {
                const logged: { [projectId: string]: number } = {};
                timeEntriesData.forEach((entry: any) => {
                    if (!logged[entry.project_id]) logged[entry.project_id] = 0;
                    logged[entry.project_id] += parseFloat(entry.hours || 0);
                });
                setLoggedHours(logged);
            }
        } catch (err: any) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateMonths = () => {
        const monthsList: MonthInfo[] = [];

        if (viewMode === 'overview') {
            // Show next 3 months
            const today = new Date();
            for (let i = 0; i < 3; i++) {
                const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
                monthsList.push({
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                });
            }
        } else {
            // Project view: show all months from project start to end
            const selectedProject = projects.find(p => p.id === selectedProjectId);
            if (selectedProject && selectedProject.start_date && selectedProject.end_date) {
                const start = new Date(selectedProject.start_date);
                const end = new Date(selectedProject.end_date);

                let current = new Date(start.getFullYear(), start.getMonth(), 1);
                const endDate = new Date(end.getFullYear(), end.getMonth(), 1);

                while (current <= endDate) {
                    monthsList.push({
                        year: current.getFullYear(),
                        month: current.getMonth() + 1,
                        label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    });
                    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
                }
            } else {
                // Fallback: show next 6 months
                const today = new Date();
                for (let i = 0; i < 6; i++) {
                    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
                    monthsList.push({
                        year: date.getFullYear(),
                        month: date.getMonth() + 1,
                        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    });
                }
            }
        }

        setMonths(monthsList);
    };

    const getAllocationKey = (projectId: string, employeeId: string, year: number, month: number) => {
        return `${projectId}_${employeeId}_${year}_${month}`;
    };

    const getAllocation = (projectId: string, employeeId: string, year: number, month: number): number => {
        const key = getAllocationKey(projectId, employeeId, year, month);
        return allocations[key] || 0;
    };

    const updateAllocation = (projectId: string, employeeId: string, year: number, month: number, hours: number) => {
        const key = getAllocationKey(projectId, employeeId, year, month);
        setAllocations(prev => ({
            ...prev,
            [key]: hours
        }));
    };

    const getEmployeeMonthlyTotal = (employeeId: string, year: number, month: number): number => {
        let total = 0;
        projects.forEach(project => {
            total += getAllocation(project.id, employeeId, year, month);
        });
        return total;
    };

    const getProjectEmployeeTotal = (projectId: string, employeeId: string): number => {
        let total = 0;
        months.forEach(m => {
            total += getAllocation(projectId, employeeId, m.year, m.month);
        });
        return total;
    };

    const getProjectMonthTotal = (projectId: string, year: number, month: number): number => {
        let total = 0;
        employees.forEach(emp => {
            total += getAllocation(projectId, emp.id, year, month);
        });
        return total;
    };

    const getProjectTotal = (projectId: string): number => {
        let total = 0;
        months.forEach(m => {
            total += getProjectMonthTotal(projectId, m.year, m.month);
        });
        return total;
    };

    const calculateProjectIncome = (project: Project): number => {
        const totalHours = getProjectTotal(project.id);
        if (project.budget_type === 'FIXED') {
            return project.total_budget || 0;
        } else {
            return totalHours * (project.hourly_rate || 0);
        }
    };

    const calculateEmployeeCost = (employeeId: string, projectId: string): number => {
        const employee = employees.find(e => e.id === employeeId);
        const project = projects.find(p => p.id === projectId);
        const totalHours = getProjectEmployeeTotal(projectId, employeeId);

        if (employee?.hourly_rate) {
            return totalHours * employee.hourly_rate;
        } else if (project?.hourly_rate) {
            return totalHours * project.hourly_rate;
        }
        return 0;
    };

    const getCapacityColor = (used: number, capacity: number): string => {
        const percentage = (used / capacity) * 100;
        if (percentage > 100) return '#fee2e2'; // red
        if (percentage >= 90) return '#fef3c7'; // yellow
        return '#dcfce7'; // green
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const schema = await getCompanySchema();

            // Convert allocations object to array for bulk upsert
            const allocationRecords = Object.entries(allocations).map(([key, hours]) => {
                const [projectId, employeeId, year, month] = key.split('_');
                return {
                    project_id: projectId,
                    employee_id: employeeId,
                    year: parseInt(year),
                    month: parseInt(month),
                    allocated_hours: hours
                };
            }).filter(record => record.allocated_hours > 0);

            // Upsert allocations
            const { error } = await supabase
                .schema(schema)
                .from('time_allocations')
                .upsert(allocationRecords, {
                    onConflict: 'tenant_id,project_id,employee_id,year,month'
                });

            if (error) throw error;

            alert('Time allocations saved successfully!');
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error('Error saving allocations:', err);
            alert('Failed to save allocations: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Time Allocation</h1>
                    <p style={{ color: '#64748b' }}>Plan resource allocation across projects and months.</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Allocations'}
                </button>
            </div>

            {/* View Mode Selector */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontWeight: 600 }}>View Mode:</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setViewMode('overview')}
                            className={viewMode === 'overview' ? 'btn btn-primary' : 'btn'}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Grid3x3 size={16} /> Overview Mode
                        </button>
                        <button
                            onClick={() => setViewMode('project')}
                            className={viewMode === 'project' ? 'btn btn-primary' : 'btn'}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <FolderKanban size={16} /> Project View Mode
                        </button>
                    </div>

                    {viewMode === 'project' && (
                        <>
                            <div style={{ borderLeft: '2px solid #e2e8f0', height: '2rem', margin: '0 1rem' }}></div>
                            <label style={{ fontWeight: 600 }}>Select Project:</label>
                            <select
                                value={selectedProjectId}
                                onChange={e => setSelectedProjectId(e.target.value)}
                                style={{ minWidth: '200px' }}
                            >
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name} {project.code ? `(${project.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
            </div>

            {/* Overview Mode Grid */}
            {viewMode === 'overview' && (
                <div className="card">
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ minWidth: '100%', fontSize: '0.875rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: 'white', zIndex: 2, minWidth: '200px' }}>Project</th>
                                    <th style={{ minWidth: '80px' }}>Logged</th>
                                    {months.map(m => (
                                        <th key={`${m.year}-${m.month}`} colSpan={employees.length} style={{ textAlign: 'center', background: '#f8fafc' }}>
                                            {m.label}
                                        </th>
                                    ))}
                                    <th style={{ minWidth: '80px' }}>Total</th>
                                    <th style={{ minWidth: '100px' }}>Income</th>
                                </tr>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}></th>
                                    <th></th>
                                    {months.map(m => (
                                        employees.map(emp => (
                                            <th key={`${m.year}-${m.month}-${emp.id}`} style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>
                                                {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                                            </th>
                                        ))
                                    ))}
                                    <th></th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(project => (
                                    <tr key={project.id}>
                                        <td style={{ position: 'sticky', left: 0, background: 'white', fontWeight: 500, zIndex: 1 }}>
                                            {project.name}
                                            {project.code && (
                                                <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                                    {project.code}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>
                                            {loggedHours[project.id] ? Math.round(loggedHours[project.id]) : 0}
                                        </td>
                                        {months.map(m => (
                                            employees.map(emp => (
                                                <td key={`${project.id}-${m.year}-${m.month}-${emp.id}`} style={{ padding: '0.25rem' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        value={getAllocation(project.id, emp.id, m.year, m.month) || ''}
                                                        onChange={e => updateAllocation(project.id, emp.id, m.year, m.month, parseFloat(e.target.value) || 0)}
                                                        style={{
                                                            width: '60px',
                                                            padding: '0.25rem',
                                                            textAlign: 'center',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '4px'
                                                        }}
                                                        placeholder="0"
                                                    />
                                                </td>
                                            ))
                                        ))}
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                            {Math.round(getProjectTotal(project.id))}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                            {project.currency || 'USD'} {Math.round(calculateProjectIncome(project)).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 600 }}>
                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>Employee Total</td>
                                    <td></td>
                                    {months.map(m => (
                                        employees.map(emp => {
                                            const total = getEmployeeMonthlyTotal(emp.id, m.year, m.month);
                                            const capacity = emp.monthly_capacity || 160;
                                            return (
                                                <td
                                                    key={`total-${m.year}-${m.month}-${emp.id}`}
                                                    style={{
                                                        textAlign: 'center',
                                                        background: getCapacityColor(total, capacity),
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    {Math.round(total)}
                                                </td>
                                            );
                                        })
                                    ))}
                                    <td colSpan={2}></td>
                                </tr>
                                <tr style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>Capacity</td>
                                    <td></td>
                                    {months.map(m => (
                                        employees.map(emp => (
                                            <td key={`capacity-${m.year}-${m.month}-${emp.id}`} style={{ textAlign: 'center' }}>
                                                {emp.monthly_capacity || 160}
                                            </td>
                                        ))
                                    ))}
                                    <td colSpan={2}></td>
                                </tr>
                                <tr style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>% Used</td>
                                    <td></td>
                                    {months.map(m => (
                                        employees.map(emp => {
                                            const total = getEmployeeMonthlyTotal(emp.id, m.year, m.month);
                                            const capacity = emp.monthly_capacity || 160;
                                            const percentage = Math.round((total / capacity) * 100);
                                            return (
                                                <td key={`percent-${m.year}-${m.month}-${emp.id}`} style={{ textAlign: 'center' }}>
                                                    {percentage}%
                                                </td>
                                            );
                                        })
                                    ))}
                                    <td colSpan={2}></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem' }}>
                        <strong>Legend:</strong>
                        <span style={{ marginLeft: '1rem', padding: '2px 8px', background: '#dcfce7', borderRadius: '4px' }}>Green: &lt;90% capacity</span>
                        <span style={{ marginLeft: '0.5rem', padding: '2px 8px', background: '#fef3c7', borderRadius: '4px' }}>Yellow: 90-100% capacity</span>
                        <span style={{ marginLeft: '0.5rem', padding: '2px 8px', background: '#fee2e2', borderRadius: '4px' }}>Red: &gt;100% capacity</span>
                    </div>
                </div>
            )}

            {/* Project View Mode Grid */}
            {viewMode === 'project' && selectedProject && (
                <div className="card">
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>{selectedProject.name}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                            <div><strong>Budget Type:</strong> {selectedProject.budget_type === 'FIXED' ? 'Fixed Budget' : 'Hourly Rate'}</div>
                            {selectedProject.budget_type === 'FIXED' ? (
                                <div><strong>Total Budget:</strong> {selectedProject.currency || 'USD'} {selectedProject.total_budget?.toLocaleString()}</div>
                            ) : (
                                <div><strong>Hourly Rate:</strong> {selectedProject.currency || 'USD'} {selectedProject.hourly_rate?.toFixed(2)}/hr</div>
                            )}
                            {selectedProject.manager && (
                                <div><strong>Manager:</strong> {selectedProject.manager.first_name} {selectedProject.manager.last_name}</div>
                            )}
                            {selectedProject.client && (
                                <div><strong>Client:</strong> {selectedProject.client.name}</div>
                            )}
                            {selectedProject.start_date && selectedProject.end_date && (
                                <div><strong>Duration:</strong> {new Date(selectedProject.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {new Date(selectedProject.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                            )}
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ minWidth: '100%', fontSize: '0.875rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: 'white', zIndex: 2, minWidth: '200px' }}>Employee</th>
                                    {months.map(m => (
                                        <th key={`${m.year}-${m.month}`} style={{ textAlign: 'center' }}>{m.label}</th>
                                    ))}
                                    <th style={{ minWidth: '100px' }}>Total Hours</th>
                                    <th style={{ minWidth: '100px' }}>Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => {
                                    const totalHours = getProjectEmployeeTotal(selectedProjectId, emp.id);
                                    const cost = calculateEmployeeCost(emp.id, selectedProjectId);

                                    return (
                                        <tr key={emp.id}>
                                            <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                <div style={{ fontWeight: 500 }}>{emp.first_name} {emp.last_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Capacity: {emp.monthly_capacity || 160} hrs/month</div>
                                            </td>
                                            {months.map(m => {
                                                const allocation = getAllocation(selectedProjectId, emp.id, m.year, m.month);
                                                const capacity = emp.monthly_capacity || 160;
                                                const monthTotal = getEmployeeMonthlyTotal(emp.id, m.year, m.month);
                                                const percentage = (monthTotal / capacity) * 100;

                                                return (
                                                    <td key={`${m.year}-${m.month}`} style={{ padding: '0.5rem' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.5"
                                                            value={allocation || ''}
                                                            onChange={e => updateAllocation(selectedProjectId, emp.id, m.year, m.month, parseFloat(e.target.value) || 0)}
                                                            style={{
                                                                width: '80px',
                                                                padding: '0.5rem',
                                                                textAlign: 'center',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '4px',
                                                                background: getCapacityColor(monthTotal, capacity)
                                                            }}
                                                            placeholder="0"
                                                        />
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '0.25rem' }}>
                                                            {Math.round(percentage)}%
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{Math.round(totalHours)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                {selectedProject.currency || 'USD'} {Math.round(cost).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 600 }}>
                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>MONTH TOTAL</td>
                                    {months.map(m => {
                                        const total = getProjectMonthTotal(selectedProjectId, m.year, m.month);
                                        return (
                                            <td key={`total-${m.year}-${m.month}`} style={{ textAlign: 'center' }}>
                                                {Math.round(total)}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'center' }}>{Math.round(getProjectTotal(selectedProjectId))}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        {selectedProject.currency || 'USD'} {Math.round(calculateProjectIncome(selectedProject)).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem' }}>
                        <strong>Legend:</strong>
                        <span style={{ marginLeft: '1rem', padding: '2px 8px', background: '#dcfce7', borderRadius: '4px' }}>Green: &lt;90% capacity</span>
                        <span style={{ marginLeft: '0.5rem', padding: '2px 8px', background: '#fef3c7', borderRadius: '4px' }}>Yellow: 90-100% capacity</span>
                        <span style={{ marginLeft: '0.5rem', padding: '2px 8px', background: '#fee2e2', borderRadius: '4px' }}>Red: &gt;100% capacity</span>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
