'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import DashboardLayout from '../../components/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const tenantId = localStorage.getItem('tenantId');

        if (!token) {
            router.push('/login');
            return;
        }

        axios.get('http://localhost:3000/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': tenantId
            }
        })
            .then(res => setStats(res.data))
            .catch(err => {
                if (err.response?.status === 401) router.push('/login');
            })
            .finally(() => setLoading(false));
    }, [router]);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;
    if (!stats) return <DashboardLayout><div>Error loading stats</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div style={{ marginBottom: '2rem' }}>
                <h1>Dashboard overview</h1>
                <p style={{ color: '#64748b' }}>Welcome back! Here's what's happening today.</p>
            </div>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Time</h3>
                    <p style={bigNumStyle}>{stats.todayMinutes}m</p>
                </div>
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Week</h3>
                    <p style={bigNumStyle}>{stats.weekMinutes}m</p>
                </div>
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Projects</h3>
                    <p style={bigNumStyle}>{stats.activeProjectsCount}</p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ height: '400px' }}>
                    <h3>Daily Activity</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.dailyActivity}>
                            <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { weekday: 'short' })} />
                            <YAxis />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                            <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ height: '400px' }}>
                    <h3>Project Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.projectDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {stats.projectDistribution?.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="card" style={{ height: '400px', marginBottom: '2rem' }}>
                <h3>Employee Distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.employeeDistribution} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Minutes" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="card">
                <h3>Recent Entries</h3>
                <div className="table-container" style={{ marginTop: '1rem', border: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Project</th>
                                <th>Description</th>
                                <th>Duration</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentEntries.map((e: any) => (
                                <tr key={e.id}>
                                    <td style={{ fontWeight: 500 }}>{e.project}</td>
                                    <td>{e.description}</td>
                                    <td>{e.minutes}m</td>
                                    <td>{new Date(e.date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}

const bigNumStyle = {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#1e293b',
    marginTop: '0.5rem',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
};
