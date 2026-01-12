'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Trash2 } from 'lucide-react';
import { supabase, getCompanySchema, getCurrentUser, insertCompanyTable, deleteCompanyTable } from '@/lib/supabase';

export default function TimeEntries() {
    const router = useRouter();
    const [entries, setEntries] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
            setCurrentUserId(user?.dbUser?.id || null);

            // Fetch projects
            const { data: projectsData } = await supabase
                .from(`${schema}.projects`)
                .select('*')
                .eq('status', 'active')
                .order('project_name');

            // Fetch time entries with related data
            const { data: entriesData } = await supabase
                .from(`${schema}.time_entries`)
                .select(`
                    id,
                    description,
                    start_time,
                    duration_minutes,
                    is_billable,
                    project:project_id (id, project_name),
                    user:user_id (id, first_name, last_name)
                `)
                .order('start_time', { ascending: false });

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

        if (!currentUserId) {
            alert('User not found');
            return;
        }

        try {
            const { error } = await insertCompanyTable('time_entries', {
                user_id: currentUserId,
                project_id: projectId,
                description,
                start_time: new Date(startTime).toISOString(),
                duration_minutes: parseInt(duration),
                is_billable: isBillable
            });

            if (error) throw error;

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
            const { error } = await deleteCompanyTable('time_entries', id);
            if (error) throw error;
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
                                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
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
                                    <td style={{ fontWeight: 500, color: '#4f46e5' }}>{e.project?.project_name || 'Unknown'}</td>
                                    <td>{e.description || '-'}</td>
                                    <td>{e.duration_minutes}m</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            background: e.is_billable ? '#d1fae5' : '#f3f4f6',
                                            color: e.is_billable ? '#065f46' : '#374151'
                                        }}>
                                            {e.is_billable ? 'Billable' : 'Non-Billable'}
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
