'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Trash2, Users } from 'lucide-react';
import { supabase, getCompanySchema, insertCompanyTable, deleteCompanyTable } from '@/lib/supabase';

export default function Employees() {
    const router = useRouter();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [employeeCode, setEmployeeCode] = useState('');
    const [position, setPosition] = useState('');
    const [department, setDepartment] = useState('');
    const [level, setLevel] = useState('');
    const [salary, setSalary] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [hourlyRate, setHourlyRate] = useState('');
    const [managerId, setManagerId] = useState('');
    const [monthlyCapacity, setMonthlyCapacity] = useState('160');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [hireDate, setHireDate] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return router.push('/login');

            const schema = await getCompanySchema();
            const { data, error } = await supabase
                .schema(schema)
                .from('employees')
                .select(`
                    *,
                    manager:manager_id (
                        id,
                        first_name,
                        last_name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmployees(data || []);
        } catch (err: any) {
            console.error('Error fetching employees:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const { error } = await insertCompanyTable('employees', {
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                employee_code: employeeCode || null,
                position: position || null,
                department: department || null,
                level: level || null,
                salary: salary ? parseFloat(salary) : null,
                currency: currency || 'USD',
                hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
                manager_id: managerId || null,
                monthly_capacity: monthlyCapacity ? parseFloat(monthlyCapacity) : 160,
                years_of_experience: yearsOfExperience ? parseFloat(yearsOfExperience) : null,
                hire_date: hireDate || null,
                status: 'ACTIVE'
            });

            if (error) throw error;

            // Reset form
            setFirstName('');
            setLastName('');
            setEmail('');
            setEmployeeCode('');
            setPosition('');
            setDepartment('');
            setLevel('');
            setSalary('');
            setCurrency('USD');
            setHourlyRate('');
            setManagerId('');
            setMonthlyCapacity('160');
            setYearsOfExperience('');
            setHireDate('');

            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to create employee');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete employee? This will affect all associated records.')) return;

        try {
            const { error } = await deleteCompanyTable('employees', id);
            if (error) throw error;
            fetchData();
        } catch (err: any) {
            alert('Cannot delete employee: they may have associated time entries or be assigned to projects.');
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Employees</h1>
                    <p style={{ color: '#64748b' }}>Manage your team members and their information.</p>
                </div>
            </div>

            {/* Add Employee Form */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Add Employee
                </h3>
                {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Personal Information */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Personal Information</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>First Name *</label>
                                <input type="text" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Last Name *</label>
                                <input type="text" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                                <input type="email" placeholder="john.doe@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee Code</label>
                                <input type="text" placeholder="EMP-001" value={employeeCode} onChange={e => setEmployeeCode(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Job Information */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Job Information</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Position</label>
                                <input type="text" placeholder="Software Engineer" value={position} onChange={e => setPosition(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Department</label>
                                <input type="text" placeholder="Engineering" value={department} onChange={e => setDepartment(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Level</label>
                                <select value={level} onChange={e => setLevel(e.target.value)}>
                                    <option value="">Select Level</option>
                                    <option value="Junior">Junior</option>
                                    <option value="Mid">Mid</option>
                                    <option value="Senior">Senior</option>
                                    <option value="Lead">Lead</option>
                                    <option value="Principal">Principal</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Manager</label>
                                <select value={managerId} onChange={e => setManagerId(e.target.value)}>
                                    <option value="">No Manager</option>
                                    {employees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.first_name} {emp.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Compensation & Capacity */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Compensation & Capacity</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Salary</label>
                                <input type="number" step="0.01" placeholder="75000.00" value={salary} onChange={e => setSalary(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Hourly Rate</label>
                                <input type="number" step="0.01" placeholder="50.00" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
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
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Monthly Capacity (hours)</label>
                                <input type="number" step="0.01" placeholder="160" value={monthlyCapacity} onChange={e => setMonthlyCapacity(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Experience & Hiring */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Experience & Hiring</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Years of Experience</label>
                                <input type="number" step="0.1" placeholder="5.5" value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Hire Date</label>
                                <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={18} /> Add Employee
                        </button>
                    </div>
                </form>
            </div>

            {/* Employees Table */}
            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>All Employees</h3>
                <div className="table-container" style={{ border: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Position</th>
                                <th>Department</th>
                                <th>Manager</th>
                                <th>Monthly Capacity</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((employee: any) => (
                                <tr key={employee.id}>
                                    <td style={{ fontWeight: 500 }}>
                                        {employee.first_name} {employee.last_name}
                                        {employee.employee_code && (
                                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                                {employee.employee_code}
                                            </span>
                                        )}
                                    </td>
                                    <td>{employee.position || '-'}</td>
                                    <td>{employee.department || '-'}</td>
                                    <td>
                                        {employee.manager ? (
                                            <span>{employee.manager.first_name} {employee.manager.last_name}</span>
                                        ) : '-'}
                                    </td>
                                    <td>{employee.monthly_capacity || 160} hrs</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            background: employee.status === 'ACTIVE' ? '#dbeafe' : '#fee2e2',
                                            color: employee.status === 'ACTIVE' ? '#1e40af' : '#991b1b'
                                        }}>
                                            {employee.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => handleDelete(employee.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
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
