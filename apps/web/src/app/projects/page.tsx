
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { FolderPlus, Trash2, Plus } from 'lucide-react';
import { supabase, getCompanySchema, insertCompanyTable, deleteCompanyTable } from '@/lib/supabase';

export default function Projects() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return router.push('/login');

            const schema = await getCompanySchema();
            const { data, error } = await supabase
                .from(`${schema}.projects`)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (err: any) {
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const { error } = await insertCompanyTable('projects', {
                project_name: name,
                project_code: code,
                description,
                status: 'active',
                budget: 0
            });

            if (error) throw error;

            setName('');
            setCode('');
            setDescription('');
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
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(200px, 1fr) minmax(150px, 1fr) 2fr auto', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Name</label>
                        <input type="text" placeholder="Project Name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Code</label>
                        <input type="text" placeholder="e.g. PRJ-01" value={code} onChange={e => setCode(e.target.value)} required />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                        <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginBottom: '2px', height: '38px' }}>
                        <Plus size={18} /> Add
                    </button>
                </form>
            </div>

            <div className="card">
                <div className="table-container" style={{ border: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map((p: any) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 500 }}>{p.project_name}</td>
                                    <td><span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{p.project_code}</span></td>
                                    <td>{p.description || '-'}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            background: p.status === 'active' ? '#dbeafe' : '#fef3c7',
                                            color: p.status === 'active' ? '#1e40af' : '#92400e'
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
