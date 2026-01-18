'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Trash2 } from 'lucide-react';
import { supabase, getCompanySchema, getCurrentUser, insertCompanyTable, deleteCompanyTable } from '@/lib/supabase';

interface TimeEntry {
    id: string;
    description: string | null;
    date: string;
    start_time: string;
    minutes: number;
    billable: boolean;
    project_id: string;
    employee_id: string;
}

interface Project {
    id: string;
    name: string;
}

export default function TimeEntries() {
    const router = useRouter();
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);

    // Form State
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState('');
    const [isBillable, setIsBillable] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const schema = await getCompanySchema();
            const user = await getCurrentUser();
            const companyId = session.user.user_metadata?.company_id;
            setTenantId(companyId || null);

            // Fetch employee record for current user (to get employee ID for time entries)
            const { data: employeeData } = await supabase
                .schema(schema)
                .from('employees')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            setEmployeeId(employeeData?.id || null);

            // Fetch projects
            const { data: projectsData } = await supabase
                .schema(schema)
                .from('projects')
                .select('*')
                .eq('status', 'ACTIVE')
                .order('name');

            // Fetch time entries from company schema
            const { data: entriesData } = await supabase
                .schema(schema)
                .from('time_entries')
                .select(`
                    id,
                    description,
                    date,
                    start_time,
                    minutes,
                    billable,
                    project_id,
                    employee_id
                `)
                .order('date', { ascending: false });

            setProjects(projectsData || []);
            setEntries(entriesData || []);
        } catch (err: any) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!employeeId || !tenantId) {
            alert('Employee or tenant not found. Make sure your user account is linked to an employee record.');
            return;
        }

        try {
            // Parse datetime-local value to separate date and time for company schema
            const dateTimeValue = new Date(startTime);
            const dateStr = dateTimeValue.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeStr = dateTimeValue.toTimeString().split(' ')[0]; // HH:MM:SS
            const mins = parseInt(duration);

            await insertCompanyTable('time_entries', {
                tenant_id: tenantId,
                employee_id: employeeId,
                project_id: projectId,
                description,
                date: dateStr,
                start_time: timeStr,
                minutes: mins,
                hours: mins / 60,
                billable: isBillable,
                source: 'MANUAL'
            });

            // Reset form and reload
            setDescription('');
            setDuration('');
            setStartTime('');
            setProjectId('');
            fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to create entry');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete entry?')) return;
        try {
            await deleteCompanyTable('time_entries', id);
            fetchData();
        } catch (err) {
            alert('Delete failed');
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Time Entries</h1>
                    <p style={{ color: '#64748b' }}>Manage your daily work logs.</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> New Entry
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Project</label>
                            <select value={projectId} onChange={e => setProjectId(e.target.value)} required>
                                <option value="">Select Project</option>
                                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Time</label>
                            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Duration (min)</label>
                            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required min="1" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="What did you work on?" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.8rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                                <input type="checkbox" checked={isBillable} onChange={e => setIsBillable(e.target.checked)} style={{ width: '1rem', height: '1rem' }} />
                                Billable
                            </label>
                        </div>
                    </div>
                    <div>
                        <button className="btn btn-primary" type="submit">
                            <Plus size={18} /> Add Entry
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="table-container" style={{ border: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Project</th>
                                <th>Description</th>
                                <th>Duration</th>
                                <th>Billable</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e: any) => (
                                <tr key={e.id}>
                                    <td>{new Date(e.start_time).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: 500, color: '#4338ca' }}>{projects.find((p: Project) => p.id === e.project_id)?.name || 'Unknown'}</td>
                                    <td>{e.description || '-'}</td>
                                    <td>{e.minutes}m</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            background: e.billable ? '#d1fae5' : '#f3f4f6',
                                            color: e.billable ? '#065f46' : '#374151'
                                        }}>
                                            {e.billable ? 'Billable' : 'Non-Billable'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => handleDelete(e.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {entries.length === 0 && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No entries found</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
