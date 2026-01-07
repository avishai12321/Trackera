'use client';
import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';

import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Calendar as CalendarIcon, Loader } from 'lucide-react';

function CalendarContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get('status');

    const [suggestions, setSuggestions] = useState([]);
    const [projects, setProjects] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    // Track selected project per suggestion. Key: suggestionId, Value: projectId
    const [selections, setSelections] = useState<Record<string, string>>({});

    useEffect(() => {
        if (status === 'success') {
            alert('Calendar connected successfully!');
            router.replace('/calendar');
        }
    }, [status, router]);

    useEffect(() => {
        fetchData();
    }, [date]);

    const fetchData = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return router.push('/login');
        const tenantId = localStorage.getItem('tenantId');

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId } };

            // Only fetch projects once if empty
            if (projects.length === 0) {
                const pRes = await axios.get('http://localhost:3000/projects', config);
                setProjects(pRes.data);
            }

            const sRes = await axios.get(`http://localhost:3000/time-entries/suggestions?date=${date}`, config);
            setSuggestions(sRes.data);

            // Initialize selections (optional, maybe select first project?)
            // setSelections({})
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (provider: 'google' | 'microsoft') => {
        const token = localStorage.getItem('accessToken');
        const tenantId = localStorage.getItem('tenantId');
        try {
            const res = await axios.get(`http://localhost:3000/calendar/connect/${provider}`, {
                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
            });
            window.location.href = res.data.url;
        } catch (err) {
            alert('Failed to initiate connection');
        }
    };

    const handleAdd = async (suggestion: any) => {
        const projectId = selections[suggestion.id];
        if (!projectId) {
            alert('Please select a project');
            return;
        }

        const token = localStorage.getItem('accessToken');
        const tenantId = localStorage.getItem('tenantId');

        try {
            await axios.post('http://localhost:3000/time-entries', {
                projectId,
                description: suggestion.title,
                startTime: suggestion.startTime, // Should be ISO
                endTime: suggestion.endTime,
                durationMinutes: suggestion.durationMinutes,
                billable: true // Default
                // employeeId inferred by backend if creating for self? 
            }, {
                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
            });

            alert('Time Entry Created');
            fetchData(); // Refresh list (suggestion should disappear)
        } catch (err) {
            alert('Failed to create entry');
        }
    };

    const handleSelectionChange = (id: string, val: string) => {
        setSelections(prev => ({ ...prev, [id]: val }));
    };

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Calendar Integration</h1>
                    <p style={{ color: '#64748b' }}>Sync your calendar events and turn them into time entries.</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Connect Calendars</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => handleConnect('google')} className="btn" style={{ background: '#DB4437', color: 'white' }}>
                        Connect Google Calendar
                    </button>
                    <button onClick={() => handleConnect('microsoft')} className="btn" style={{ background: '#0078D4', color: 'white' }}>
                        Connect Microsoft Calendar
                    </button>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CalendarIcon size={18} /> Suggestions for {date}
                    </h3>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto' }} />
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        <Loader className="animate-spin" size={24} style={{ display: 'inline-block', marginRight: '0.5rem' }} /> Loading...
                    </div>
                ) : (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Time</th>
                                    <th>Duration</th>
                                    <th>Project</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suggestions.map((s: any) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 500 }}>{s.title}</td>
                                        <td>
                                            {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                            {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>{s.durationMinutes}m</td>
                                        <td>
                                            <select
                                                value={selections[s.id] || ''}
                                                onChange={e => handleSelectionChange(s.id, e.target.value)}
                                                style={{ marginBottom: 0, padding: '0.25rem 0.5rem' }}
                                            >
                                                <option value="">Select Project</option>
                                                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <button onClick={() => handleAdd(s)} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                                                <Plus size={14} /> Add
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {suggestions.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No suggestions found for this date.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CalendarContent />
        </Suspense>
    );
}
