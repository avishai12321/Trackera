
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { FolderPlus, Trash2, Plus } from 'lucide-react';
import { supabase, getCompanySchema, insertCompanyTable, deleteCompanyTable } from '@/lib/supabase';

export default function Projects() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [clientId, setClientId] = useState('');
    const [managerId, setManagerId] = useState('');
    const [budgetType, setBudgetType] = useState('FIXED');
    const [totalBudget, setTotalBudget] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const { error } = await insertCompanyTable('projects', {
                name,
                code: code || null,
                description: description || null,
                client_id: clientId || null,
                manager_id: managerId || null,
                budget_type: budgetType,
                total_budget: budgetType === 'FIXED' && totalBudget ? parseFloat(totalBudget) : null,
                hourly_rate: budgetType === 'HOURLY_RATE' && hourlyRate ? parseFloat(hourlyRate) : null,
                estimated_hours: budgetType === 'HOURLY_RATE' && estimatedHours ? parseFloat(estimatedHours) : null,
                currency: currency || 'USD',
                start_date: startDate || null,
                end_date: endDate || null,
                status: 'ACTIVE'
            });

            if (error) throw error;

            // Reset form
            setName('');
            setCode('');
            setDescription('');
            setClientId('');
            setManagerId('');
            setBudgetType('FIXED');
            setTotalBudget('');
            setHourlyRate('');
            setEstimatedHours('');
            setCurrency('USD');
            setStartDate('');
            setEndDate('');

            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to create project');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete project?')) return;

        try {
            const { error } = await deleteCompanyTable('projects', id);
            if (error) throw error;
            fetchData();
        } catch (err: any) {
            alert('Cannot delete project: it may have associated time entries.');
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Projects</h1>
                    <p style={{ color: '#64748b' }}>Manage your organization's projects.</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Add Project
                </h3>
                {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Basic Information */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Basic Information</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Name *</label>
                                <input type="text" placeholder="Project Name" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Code</label>
                                <input type="text" placeholder="PRJ-001" value={code} onChange={e => setCode(e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                                <input type="text" placeholder="Project description..." value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Client & Manager */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Client & Manager</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Client</label>
                                <select value={clientId} onChange={e => setClientId(e.target.value)}>
                                    <option value="">No Client</option>
                                    {clients.map((client: any) => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project Manager</label>
                                <select value={managerId} onChange={e => setManagerId(e.target.value)}>
                                    <option value="">No Manager</option>
                                    {employees.map((emp: any) => (
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
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" value="FIXED" checked={budgetType === 'FIXED'} onChange={e => setBudgetType(e.target.value)} />
                                    <span>Fixed Budget</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" value="HOURLY_RATE" checked={budgetType === 'HOURLY_RATE'} onChange={e => setBudgetType(e.target.value)} />
                                    <span>Hourly Rate</span>
                                </label>
                            </div>
                        </div>

                        {budgetType === 'FIXED' ? (
                            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Total Budget</label>
                                    <input type="number" step="0.01" placeholder="50000.00" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                    <select value={currency} onChange={e => setCurrency(e.target.value)}>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="ILS">ILS</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Hourly Rate</label>
                                    <input type="number" step="0.01" placeholder="150.00" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Estimated Hours</label>
                                    <input type="number" step="0.01" placeholder="500" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                    <select value={currency} onChange={e => setCurrency(e.target.value)}>
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
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={18} /> Add Project
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>All Projects</h3>
                <div className="table-container" style={{ border: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Client</th>
                                <th>Manager</th>
                                <th>Budget Type</th>
                                <th>Budget/Rate</th>
                                <th>Timeline</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map((p: any) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                                    <td>
                                        {p.code && (
                                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                {p.code}
                                            </span>
                                        )}
                                    </td>
                                    <td>{p.client ? p.client.name : '-'}</td>
                                    <td>
                                        {p.manager ? (
                                            <span>{p.manager.first_name} {p.manager.last_name}</span>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            background: p.budget_type === 'FIXED' ? '#e0e7ff' : '#fef3c7',
                                            color: p.budget_type === 'FIXED' ? '#3730a3' : '#92400e'
                                        }}>
                                            {p.budget_type === 'FIXED' ? 'Fixed Budget' : 'Hourly Rate'}
                                        </span>
                                    </td>
                                    <td>
                                        {p.budget_type === 'FIXED' ? (
                                            p.total_budget ? `${p.currency || 'USD'} ${parseFloat(p.total_budget).toLocaleString()}` : '-'
                                        ) : (
                                            p.hourly_rate ? `${p.currency || 'USD'} ${parseFloat(p.hourly_rate).toFixed(2)}/hr` : '-'
                                        )}
                                    </td>
                                    <td style={{ fontSize: '0.875rem' }}>
                                        {p.start_date || p.end_date ? (
                                            <>
                                                {p.start_date ? new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '?'}
                                                {' - '}
                                                {p.end_date ? new Date(p.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '?'}
                                            </>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            background: p.status === 'ACTIVE' ? '#dbeafe' : '#fee2e2',
                                            color: p.status === 'ACTIVE' ? '#1e40af' : '#991b1b'
                                        }}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => handleDelete(p.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
