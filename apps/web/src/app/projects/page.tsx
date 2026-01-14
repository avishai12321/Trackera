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
    const [editingId, setEditingId] = useState<string | null>(null);

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

    // Edit state
    const [editData, setEditData] = useState<Partial<Project>>({});

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

    const startEdit = (project: Project) => {
        setEditingId(project.id);
        setEditData({
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
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = async (id: string) => {
        try {
            await updateCompanyTable('projects', id, {
                name: editData.name,
                code: editData.code || null,
                description: editData.description || null,
                client_id: editData.client_id || null,
                manager_id: editData.manager_id || null,
                budget_type: editData.budget_type || 'FIXED',
                total_budget: editData.budget_type === 'FIXED' ? editData.total_budget : null,
                hourly_rate: editData.budget_type === 'HOURLY_RATE' ? editData.hourly_rate : null,
                estimated_hours: editData.budget_type === 'HOURLY_RATE' ? editData.estimated_hours : null,
                currency: editData.currency || 'USD',
                start_date: editData.start_date || null,
                end_date: editData.end_date || null,
                status: editData.status || 'ACTIVE',
            });
            setEditingId(null);
            setEditData({});
            fetchData();
        } catch (err: any) {
            alert('Failed to update project: ' + err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete project?')) return;

        try {
            await deleteCompanyTable('projects', id);
            fetchData();
        } catch (err: any) {
            alert('Cannot delete project: it may have associated time entries.');
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            {/* Header with Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Projects</h1>
                    <p style={{ color: '#64748b' }}>Manage your organization's projects.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} /> Add Project
                </button>
            </div>

            {/* Projects Table - Main Content */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <h3 style={{ marginBottom: '1rem' }}>All Projects ({projects.length})</h3>
                {projects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p>No projects yet. Click "Add Project" to create your first one.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>Actions</th>
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
                                {projects.map((project) => (
                                    <tr key={project.id}>
                                        {editingId === project.id ? (
                                            <>
                                                <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button onClick={() => saveEdit(project.id)} className="btn" style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: 'white' }}>
                                                            <Check size={14} />
                                                        </button>
                                                        <button onClick={cancelEdit} className="btn" style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white' }}>
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={editData.name || ''}
                                                        onChange={e => setEditData({...editData, name: e.target.value})}
                                                        style={{ width: '120px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={editData.code || ''}
                                                        onChange={e => setEditData({...editData, code: e.target.value})}
                                                        style={{ width: '60px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        value={editData.client_id || ''}
                                                        onChange={e => setEditData({...editData, client_id: e.target.value})}
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
                                                        value={editData.manager_id || ''}
                                                        onChange={e => setEditData({...editData, manager_id: e.target.value})}
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
                                                        value={editData.budget_type || 'FIXED'}
                                                        onChange={e => setEditData({...editData, budget_type: e.target.value})}
                                                        style={{ width: '80px', padding: '0.25rem' }}
                                                    >
                                                        <option value="FIXED">Fixed</option>
                                                        <option value="HOURLY_RATE">Hourly</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                                        <input
                                                            type="number"
                                                            placeholder={editData.budget_type === 'FIXED' ? 'Budget' : 'Rate'}
                                                            value={editData.budget_type === 'FIXED' ? (editData.total_budget || '') : (editData.hourly_rate || '')}
                                                            onChange={e => {
                                                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                                                if (editData.budget_type === 'FIXED') {
                                                                    setEditData({...editData, total_budget: val});
                                                                } else {
                                                                    setEditData({...editData, hourly_rate: val});
                                                                }
                                                            }}
                                                            style={{ width: '80px', padding: '0.25rem' }}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="date"
                                                        value={editData.start_date || ''}
                                                        onChange={e => setEditData({...editData, start_date: e.target.value})}
                                                        style={{ width: '120px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="date"
                                                        value={editData.end_date || ''}
                                                        onChange={e => setEditData({...editData, end_date: e.target.value})}
                                                        style={{ width: '120px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        value={editData.status || 'ACTIVE'}
                                                        onChange={e => setEditData({...editData, status: e.target.value})}
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
                                                        <button onClick={() => startEdit(project)} className="btn" style={{ padding: '0.25rem 0.5rem', background: '#3b82f6', color: 'white' }}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(project.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
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
                                                        background: project.budget_type === 'FIXED' ? '#e0e7ff' : '#fef3c7',
                                                        color: project.budget_type === 'FIXED' ? '#3730a3' : '#92400e'
                                                    }}>
                                                        {project.budget_type === 'FIXED' ? 'Fixed' : 'Hourly'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {project.budget_type === 'FIXED' ? (
                                                        project.total_budget ? `${project.currency || 'USD'} ${parseFloat(String(project.total_budget)).toLocaleString()}` : '-'
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
                                                        background: project.status === 'ACTIVE' ? '#dbeafe' : '#f3f4f6',
                                                        color: project.status === 'ACTIVE' ? '#1e40af' : '#4b5563'
                                                    }}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
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
                                        <input type="text" placeholder="Project Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Code</label>
                                        <input type="text" placeholder="PRJ-001" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                                        <input type="text" placeholder="Project description..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Client & Manager */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Client & Manager</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Client</label>
                                        <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                                            <option value="">No Client</option>
                                            {clients.map((client) => (
                                                <option key={client.id} value={client.id}>{client.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project Manager</label>
                                        <select value={formData.managerId} onChange={e => setFormData({...formData, managerId: e.target.value})}>
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
                                            <input type="radio" value="FIXED" checked={formData.budgetType === 'FIXED'} onChange={e => setFormData({...formData, budgetType: e.target.value})} />
                                            <span>Fixed Budget</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="radio" value="HOURLY_RATE" checked={formData.budgetType === 'HOURLY_RATE'} onChange={e => setFormData({...formData, budgetType: e.target.value})} />
                                            <span>Hourly Rate</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="radio" value="MONTHLY_RATE" checked={formData.budgetType === 'MONTHLY_RATE'} onChange={e => setFormData({...formData, budgetType: e.target.value})} />
                                            <span>Monthly Rate</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.budgetType === 'FIXED' && (
                                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Total Budget</label>
                                            <input type="number" step="0.01" placeholder="50000.00" value={formData.totalBudget} onChange={e => setFormData({...formData, totalBudget: e.target.value})} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
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
                                            <input type="number" step="0.01" placeholder="150.00" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: e.target.value})} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Estimated Hours</label>
                                            <input type="number" step="0.01" placeholder="500" value={formData.estimatedHours} onChange={e => setFormData({...formData, estimatedHours: e.target.value})} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
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
                                            <input type="number" step="0.01" placeholder="5000.00" value={formData.monthlyRate} onChange={e => setFormData({...formData, monthlyRate: e.target.value})} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
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
                                        <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Date</label>
                                        <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
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
        </DashboardLayout>
    );
}
