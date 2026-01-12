'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { supabase, getCompanySchema } from '@/lib/supabase';

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
        <DashboardLayout>
            <div style={{ marginBottom: '2rem' }}>
                <h1>Analytics Dashboard</h1>
                <p style={{ color: '#64748b' }}>Comprehensive insights across company, projects, and employees</p>
            </div>

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
    );
}

// ============================================
// TAB 1: COMPANY OVERVIEW
// ============================================
function CompanyOverviewTab() {
    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Company Overview</h2>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <MetricCard title="Total Open Projects" value="--" />
                <MetricCard title="Number of Employees" value="--" />
                <MetricCard title="Company Capacity" value="--%" />
                <MetricCard title="Total Projected Income" value="$--" />
            </div>

            {/* Visual Slots */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
                <VisualPlaceholder title="Project Execution Rates" description="Execution rate percentage for each open project" />
                <VisualPlaceholder title="Hours per Employee per Project" description="Planned vs actual hours breakdown by employee and project" />
            </div>
        </div>
    );
}

// ============================================
// TAB 2: PROJECT VIEW
// ============================================
function ProjectViewTab() {
    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Project View</h2>

            {/* Project Selector */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Project</label>
                <select style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '1rem'
                }}>
                    <option>Select a project...</option>
                </select>
            </div>

            {/* Project Info Card */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3>Project Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <InfoItem label="Project Name" value="--" />
                    <InfoItem label="Customer" value="--" />
                    <InfoItem label="Project Manager" value="--" />
                    <InfoItem label="Total Budget" value="$--" />
                    <InfoItem label="Monthly Budget" value="$--" />
                    <InfoItem label="Progress" value="--%"  />
                </div>
            </div>

            {/* Visual Slots */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <VisualPlaceholder title="Work Distribution" description="Hours per employee on this project" />
                <VisualPlaceholder title="Project Progress" description="Overall completion percentage" />
            </div>

            <VisualPlaceholder title="Planned vs Actual by Month" description="Monthly comparison of planned and actual hours" />
        </div>
    );
}

// ============================================
// TAB 3: EMPLOYEE OVERVIEW
// ============================================
function EmployeeOverviewTab() {
    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Employee Overview</h2>

            {/* Employee Table Placeholder */}
            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee Name</th>
                                <th>Last Time Report</th>
                                <th>Monthly Planned Load</th>
                                <th>Current Projects</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    📊 Employee data will appear here
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <VisualPlaceholder title="Hours Distribution per Employee" description="Breakdown of hours by project for each employee" />
            </div>
        </div>
    );
}

// ============================================
// TAB 4: EMPLOYEE DEEP DIVE
// ============================================
function EmployeeDeepDiveTab() {
    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Employee Deep Dive</h2>

            {/* Employee Selector */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Employee</label>
                <select style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '1rem'
                }}>
                    <option>Select an employee...</option>
                </select>
            </div>

            {/* Employee Profile Card */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3>Employee Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <InfoItem label="Name" value="--" />
                    <InfoItem label="Position" value="--" />
                    <InfoItem label="Level" value="--" />
                    <InfoItem label="Experience" value="-- years" />
                    <InfoItem label="Last Time Report" value="--" />
                    <InfoItem label="Number of Projects" value="--" />
                </div>
            </div>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <MetricCard title="Project Success Rate" value="--%" />
                <MetricCard title="Avg Occupancy Level" value="--%" />
                <MetricCard title="Avg Plan Execution Rate" value="--%" />
            </div>

            {/* Visual Slots */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
                <VisualPlaceholder title="Current Projects Execution" description="Execution rate for each active project" />
                <VisualPlaceholder title="Workload Distribution" description="Hours distribution across projects" />
                <VisualPlaceholder title="Monthly Overview" description="Available vs Planned vs Actual hours by month" />
            </div>
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
