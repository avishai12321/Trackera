'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { supabase, getCompanySchema, insertCompanyTable, updateCompanyTable, deleteCompanyTable } from '@/lib/supabase';

interface Project {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    client_id: string | null;
    manager_id: string | null;
    budget_type: string;
    total_budget: number | null;
    hourly_rate: number | null;
    estimated_hours: number | null;
    currency: string | null;
    client?: { id: string; name: string } | null;
    manager?: { id: string; first_name: string; last_name: string } | null;
}

interface Client {
    id: string;
    name: string;
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
}

export default function Projects() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');

    // Form state for adding
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        clientId: '',
        managerId: '',
        budgetType: 'FIXED',
        totalBudget: '',
        hourlyRate: '',
        monthlyRate: '',
        estimatedHours: '',
        currency: 'USD',
        startDate: '',
        endDate: '',
    });

    // Edit state - now stores all project edits by ID
    const [editData, setEditData] = useState<Record<string, Partial<Project>>>({});

    useEffect(() => {
        fetchData();
    }, []);

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
                    client:client_id (id, name),
                    manager:manager_id (id, first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;
            setProjects(projectsData || []);

            // Fetch clients for dropdown
            const { data: clientsData, error: clientsError } = await supabase
                .schema(schema)
                .from('clients')
                .select('id, name')
                .eq('status', 'ACTIVE')
                .order('name');

            if (clientsError) throw clientsError;
            setClients(clientsData || []);

            // Fetch employees for manager dropdown
            const { data: employeesData, error: employeesError } = await supabase
                .schema(schema)
                .from('employees')
                .select('id, first_name, last_name')
                .eq('status', 'ACTIVE')
                .order('first_name');

            if (employeesError) throw employeesError;
            setEmployees(employeesData || []);
        } catch (err: any) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            description: '',
            clientId: '',
            managerId: '',
            budgetType: 'FIXED',
            totalBudget: '',
            hourlyRate: '',
            monthlyRate: '',
            estimatedHours: '',
            currency: 'USD',
            startDate: '',
            endDate: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            // For MONTHLY_RATE, we store the monthly rate in total_budget (represents monthly value)
            const budgetTypeForDb = formData.budgetType === 'MONTHLY_RATE' ? 'MONTHLY_RATE' : formData.budgetType;
            let totalBudgetValue = null;
            let hourlyRateValue = null;

            if (formData.budgetType === 'FIXED' && formData.totalBudget) {
                totalBudgetValue = parseFloat(formData.totalBudget);
            } else if (formData.budgetType === 'MONTHLY_RATE' && formData.monthlyRate) {
                totalBudgetValue = parseFloat(formData.monthlyRate); // Store monthly rate in total_budget
            } else if (formData.budgetType === 'HOURLY_RATE' && formData.hourlyRate) {
                hourlyRateValue = parseFloat(formData.hourlyRate);
            }

            await insertCompanyTable('projects', {
                name: formData.name,
                code: formData.code || null,
                description: formData.description || null,
                client_id: formData.clientId || null,
                manager_id: formData.managerId || null,
                budget_type: budgetTypeForDb,
                total_budget: totalBudgetValue,
                hourly_rate: hourlyRateValue,
                estimated_hours: formData.budgetType === 'HOURLY_RATE' && formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
                currency: formData.currency || 'USD',
                start_date: formData.startDate || null,
                end_date: formData.endDate || null,
                status: 'ACTIVE'
            });

            resetForm();
            setShowAddForm(false);
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to create project');
        }
    };

    const toggleEditMode = () => {
        if (isEditMode) {
            // Exiting edit mode - clear all edits
            setEditData({});
        } else {
            // Entering edit mode - initialize editData with all current project values
            const initialEditData: Record<string, Partial<Project>> = {};
            projects.forEach((project) => {
                initialEditData[project.id] = {
                    name: project.name,
                    code: project.code,
                    description: project.description,
                    client_id: project.client_id,
                    manager_id: project.manager_id,
                    budget_type: project.budget_type,
                    total_budget: project.total_budget,
                    hourly_rate: project.hourly_rate,
                    estimated_hours: project.estimated_hours,
                    currency: project.currency,
                    start_date: project.start_date,
                    end_date: project.end_date,
                    status: project.status,
                };
            });
            setEditData(initialEditData);
        }
        setIsEditMode(!isEditMode);
    };

    const saveAllEdits = async () => {
        try {
            // Save all edited projects
            for (const [id, data] of Object.entries(editData)) {
                await updateCompanyTable('projects', id, {
                    name: data.name,
                    code: data.code || null,
                    description: data.description || null,
                    client_id: data.client_id || null,
                    manager_id: data.manager_id || null,
                    budget_type: data.budget_type || 'FIXED',
                    total_budget: (data.budget_type === 'FIXED' || data.budget_type === 'MONTHLY_RATE') ? data.total_budget : null,
                    hourly_rate: data.budget_type === 'HOURLY_RATE' ? data.hourly_rate : null,
                    estimated_hours: data.budget_type === 'HOURLY_RATE' ? data.estimated_hours : null,
                    currency: data.currency || 'USD',
                    start_date: data.start_date || null,
                    end_date: data.end_date || null,
                    status: data.status || 'ACTIVE',
                });
            }
            setIsEditMode(false);
            setEditData({});
            fetchData();
        } catch (err: any) {
            alert('Failed to update projects: ' + err.message);
        }
    };

    const updateProjectField = (id: string, field: keyof Project, value: any) => {
        setEditData((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleDeleteClick = (id: string) => {
        setProjectToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!projectToDelete) return;

        try {
            console.log('Starting project deletion:', projectToDelete);
            await deleteCompanyTable('projects', projectToDelete);
            console.log('Project deleted successfully');
            setShowDeleteModal(false);
            setProjectToDelete(null);
            fetchData();
        } catch (err: any) {
            console.error('Error deleting project:', err);
            alert(`Cannot delete project: ${err.message || 'Unknown error'}`);
            setShowDeleteModal(false);
            setProjectToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setProjectToDelete(null);
    };

    // Filter projects based on status
    const filteredProjects = statusFilter === 'ALL'
        ? projects
        : projects.filter(proj => proj.status === statusFilter);

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            {/* Header with Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Projects</h1>
                    <p style={{ color: '#64748b' }}>Manage your organization's projects.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isEditMode ? (
                        <>
                            <button
                                onClick={saveAllEdits}
                                className="btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white' }}
                            >
                                <Check size={18} /> Save All
                            </button>
                            <button
                                onClick={toggleEditMode}
                                className="btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#6b7280', color: 'white' }}
                            >
                                <X size={18} /> Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={toggleEditMode}
                                className="btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#6366f1', color: 'white' }}
                            >
                                <Edit2 size={18} /> Edit Mode
                            </button>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Plus size={18} /> Add Project
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Projects Table - Main Content */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>
                        {statusFilter === 'ALL' ? 'All Projects' : statusFilter === 'ACTIVE' ? 'Active Projects' : 'Archived Projects'}
                        {' '}({filteredProjects.length})
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Filter:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'ARCHIVED')}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                background: 'white'
                            }}
                        >
                            <option value="ACTIVE">Active Only</option>
                            <option value="ARCHIVED">Archived Only</option>
                            <option value="ALL">All Projects</option>
                        </select>
                    </div>
                </div>
                {filteredProjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p>No projects yet. Click "Add Project" to create your first one.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>{isEditMode ? 'Delete' : 'Actions'}</th>
                                    <th>Name</th>
                                    <th>Code</th>
                                    <th>Client</th>
                                    <th>Manager</th>
                                    <th>Budget Type</th>
                                    <th>Budget/Rate</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map((project) => {
                                    const projectEdit = editData[project.id] || {};
                                    return (
                                        <tr key={project.id}>
                                            {isEditMode ? (
                                                <>
                                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                        <button onClick={() => handleDeleteClick(project.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={projectEdit.name || ''}
                                                            onChange={e => updateProjectField(project.id, 'name', e.target.value)}
                                                            style={{ width: '120px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={projectEdit.code || ''}
                                                            onChange={e => updateProjectField(project.id, 'code', e.target.value)}
                                                            style={{ width: '60px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={projectEdit.client_id || ''}
                                                            onChange={e => updateProjectField(project.id, 'client_id', e.target.value)}
                                                            style={{ width: '100px', padding: '0.25rem' }}
                                                        >
                                                            <option value="">-</option>
                                                            {clients.map((c) => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={projectEdit.manager_id || ''}
                                                            onChange={e => updateProjectField(project.id, 'manager_id', e.target.value)}
                                                            style={{ width: '100px', padding: '0.25rem' }}
                                                        >
                                                            <option value="">-</option>
                                                            {employees.map((emp) => (
                                                                <option key={emp.id} value={emp.id}>
                                                                    {emp.first_name} {emp.last_name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={projectEdit.budget_type || 'FIXED'}
                                                            onChange={e => updateProjectField(project.id, 'budget_type', e.target.value)}
                                                            style={{ width: '80px', padding: '0.25rem' }}
                                                        >
                                                            <option value="FIXED">Fixed</option>
                                                            <option value="HOURLY_RATE">Hourly</option>
                                                            <option value="MONTHLY_RATE">Monthly</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                                            <input
                                                                type="number"
                                                                placeholder={projectEdit.budget_type === 'HOURLY_RATE' ? 'Rate' : (projectEdit.budget_type === 'MONTHLY_RATE' ? 'Monthly' : 'Budget')}
                                                                value={projectEdit.budget_type === 'HOURLY_RATE' ? (projectEdit.hourly_rate || '') : (projectEdit.total_budget || '')}
                                                                onChange={e => {
                                                                    const val = e.target.value ? parseFloat(e.target.value) : null;
                                                                    if (projectEdit.budget_type === 'HOURLY_RATE') {
                                                                        updateProjectField(project.id, 'hourly_rate', val);
                                                                    } else {
                                                                        updateProjectField(project.id, 'total_budget', val);
                                                                    }
                                                                }}
                                                                style={{ width: '80px', padding: '0.25rem' }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="date"
                                                            value={projectEdit.start_date || ''}
                                                            onChange={e => updateProjectField(project.id, 'start_date', e.target.value)}
                                                            style={{ width: '120px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="date"
                                                            value={projectEdit.end_date || ''}
                                                            onChange={e => updateProjectField(project.id, 'end_date', e.target.value)}
                                                            style={{ width: '120px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={projectEdit.status || 'ACTIVE'}
                                                            onChange={e => updateProjectField(project.id, 'status', e.target.value)}
                                                            style={{ width: '80px', padding: '0.25rem' }}
                                                        >
                                                            <option value="ACTIVE">ACTIVE</option>
                                                            <option value="ARCHIVED">ARCHIVED</option>
                                                        </select>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button onClick={() => handleDeleteClick(project.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 500 }}>{project.name}</td>
                                                    <td>
                                                        {project.code ? (
                                                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                                {project.code}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td>{project.client ? project.client.name : '-'}</td>
                                                    <td>
                                                        {project.manager ? (
                                                            <span>{project.manager.first_name} {project.manager.last_name}</span>
                                                        ) : '-'}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            background: project.budget_type === 'FIXED' ? '#eef2ff' : (project.budget_type === 'MONTHLY_RATE' ? '#f0fdf4' : '#fef3c7'),
                                                            color: project.budget_type === 'FIXED' ? '#4338ca' : (project.budget_type === 'MONTHLY_RATE' ? '#15803d' : '#b45309')
                                                        }}>
                                                            {project.budget_type === 'FIXED' ? 'Fixed' : (project.budget_type === 'MONTHLY_RATE' ? 'Monthly' : 'Hourly')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {project.budget_type === 'FIXED' ? (
                                                            project.total_budget ? `${project.currency || 'USD'} ${parseFloat(String(project.total_budget)).toLocaleString()}` : '-'
                                                        ) : project.budget_type === 'MONTHLY_RATE' ? (
                                                            project.total_budget ? `${project.currency || 'USD'} ${parseFloat(String(project.total_budget)).toLocaleString()}/mo` : '-'
                                                        ) : (
                                                            project.hourly_rate ? `${project.currency || 'USD'} ${parseFloat(String(project.hourly_rate)).toFixed(2)}/hr` : '-'
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: '0.875rem' }}>
                                                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td style={{ fontSize: '0.875rem' }}>
                                                        {project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '999px',
                                                            fontSize: '0.75rem',
                                                            background: project.status === 'ACTIVE' ? '#eef2ff' : '#f3f4f6',
                                                            color: project.status === 'ACTIVE' ? '#4338ca' : '#4b5563'
                                                        }}>
                                                            {project.status}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Project Modal */}
            {showAddForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '2rem',
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Plus size={18} /> Add Project
                            </h3>
                            <button onClick={() => { setShowAddForm(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Basic Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Basic Information</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Name *</label>
                                        <input type="text" placeholder="Project Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Code</label>
                                        <input type="text" placeholder="PRJ-001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                                        <input type="text" placeholder="Project description..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Client & Manager */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Client & Manager</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Client</label>
                                        <select value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                                            <option value="">No Client</option>
                                            {clients.map((client) => (
                                                <option key={client.id} value={client.id}>{client.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project Manager</label>
                                        <select value={formData.managerId} onChange={e => setFormData({ ...formData, managerId: e.target.value })}>
                                            <option value="">No Manager</option>
                                            {employees.map((emp) => (
                                                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Budget Configuration */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Budget Configuration</h4>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Budget Type</label>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="radio" value="FIXED" checked={formData.budgetType === 'FIXED'} onChange={e => setFormData({ ...formData, budgetType: e.target.value })} />
                                            <span>Fixed Budget</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="radio" value="HOURLY_RATE" checked={formData.budgetType === 'HOURLY_RATE'} onChange={e => setFormData({ ...formData, budgetType: e.target.value })} />
                                            <span>Hourly Rate</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="radio" value="MONTHLY_RATE" checked={formData.budgetType === 'MONTHLY_RATE'} onChange={e => setFormData({ ...formData, budgetType: e.target.value })} />
                                            <span>Monthly Rate</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.budgetType === 'FIXED' && (
                                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Total Budget</label>
                                            <input type="number" step="0.01" placeholder="50000.00" value={formData.totalBudget} onChange={e => setFormData({ ...formData, totalBudget: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                            <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                                <option value="GBP">GBP</option>
                                                <option value="ILS">ILS</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {formData.budgetType === 'HOURLY_RATE' && (
                                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Hourly Rate</label>
                                            <input type="number" step="0.01" placeholder="150.00" value={formData.hourlyRate} onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Estimated Hours</label>
                                            <input type="number" step="0.01" placeholder="500" value={formData.estimatedHours} onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                            <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                                <option value="GBP">GBP</option>
                                                <option value="ILS">ILS</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {formData.budgetType === 'MONTHLY_RATE' && (
                                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Monthly Rate</label>
                                            <input type="number" step="0.01" placeholder="5000.00" value={formData.monthlyRate} onChange={e => setFormData({ ...formData, monthlyRate: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                            <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                                <option value="GBP">GBP</option>
                                                <option value="ILS">ILS</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Timeline</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date</label>
                                        <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Date</label>
                                        <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} className="btn" style={{ background: '#e2e8f0' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={18} /> Add Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '90%',
                    }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <Trash2 size={24} style={{ color: '#ef4444' }} />
                                <h3 style={{ color: '#ef4444', margin: 0 }}>Delete Project</h3>
                            </div>
                            <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
                                Are you sure you want to delete this project?
                            </p>
                            <div style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '1rem',
                                marginBottom: '1rem'
                            }}>
                                <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Warning: This action cannot be undone!
                                </p>
                                <p style={{ color: '#7f1d1d', fontSize: '0.875rem', lineHeight: '1.5', margin: 0 }}>
                                    Deleting this project will permanently remove:
                                </p>
                                <ul style={{ color: '#7f1d1d', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                                    <li>All time allocations associated with this project</li>
                                    <li>All budget data for this project</li>
                                    <li>All time entries logged to this project</li>
                                    <li>The project and all its configuration</li>
                                </ul>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                onClick={handleDeleteCancel}
                                className="btn"
                                style={{ background: '#e2e8f0', color: '#1e293b' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="btn"
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                <Trash2 size={18} /> Delete Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
