'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Trash2, Edit2, X, Check, ClipboardCheck, Download, Star, Pencil } from 'lucide-react';
import { supabase, getCompanySchema, insertCompanyTable, updateCompanyTable, deleteCompanyTable } from '@/lib/supabase';
import axios from 'axios';

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    employee_code: string | null;
    position: string | null;
    department: string | null;
    level: string | null;
    salary: number | null;
    currency: string | null;
    hourly_rate: number | null;
    manager_id: string | null;
    monthly_capacity: number | null;
    years_of_experience: number | null;
    hire_date: string | null;
    status: string;
    manager?: { id: string; first_name: string; last_name: string } | null;
}

interface EmployeeReview {
    id: string;
    employee_id: string;
    reviewer_id: string;
    review_date: string;
    score_presentation: number | null;
    score_time_management: number | null;
    score_excel_skills: number | null;
    score_proficiency: number | null;
    score_transparency: number | null;
    score_creativity: number | null;
    score_overall: number | null;
    positive_skills: string[];
    improvement_skills: string[];
    action_items: string | null;
    employee_commentary: string | null;
    employee?: Employee | null;
    reviewer?: Employee | null;
}

export default function Employees() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

    // Review-related state
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [selectedEmployeeForReviews, setSelectedEmployeeForReviews] = useState<Employee | null>(null);
    const [employeeReviews, setEmployeeReviews] = useState<EmployeeReview[]>([]);
    const [showAddReviewForm, setShowAddReviewForm] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [reviewFormData, setReviewFormData] = useState({
        employeeId: '',
        reviewDate: new Date().toISOString().split('T')[0],
        scorePresentation: '',
        scoreTimeManagement: '',
        scoreExcelSkills: '',
        scoreProficiency: '',
        scoreTransparency: '',
        scoreCreativity: '',
        scoreOverall: '',
        positiveSkills: [] as string[],
        improvementSkills: [] as string[],
        actionItems: '',
        employeeCommentary: '',
    });
    const [newPositiveSkill, setNewPositiveSkill] = useState('');
    const [newImprovementSkill, setNewImprovementSkill] = useState('');
    const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});

    // Form state for adding
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        employeeCode: '',
        position: '',
        department: '',
        level: '',
        salary: '',
        currency: 'USD',
        hourlyRate: '',
        managerId: '',
        monthlyCapacity: '160',
        yearsOfExperience: '',
        hireDate: '',
    });

    // Edit state - now stores all employee edits by ID
    const [editData, setEditData] = useState<Record<string, Partial<Employee>>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return router.push('/login');

            const schema = await getCompanySchema();
            const companyId = session.user.user_metadata?.company_id;
            setTenantId(companyId || null);

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

            // Fetch review counts for each employee
            const { data: reviewsData } = await supabase
                .schema(schema)
                .from('employee_reviews')
                .select('employee_id');

            if (reviewsData) {
                const counts: Record<string, number> = {};
                reviewsData.forEach(review => {
                    counts[review.employee_id] = (counts[review.employee_id] || 0) + 1;
                });
                setReviewCounts(counts);
            }
        } catch (err: any) {
            console.error('Error fetching employees:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            employeeCode: '',
            position: '',
            department: '',
            level: '',
            salary: '',
            currency: 'USD',
            hourlyRate: '',
            managerId: '',
            monthlyCapacity: '160',
            yearsOfExperience: '',
            hireDate: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await insertCompanyTable('employees', {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email || null,
                employee_code: formData.employeeCode || null,
                position: formData.position || null,
                department: formData.department || null,
                level: formData.level || null,
                salary: formData.salary ? parseFloat(formData.salary) : null,
                currency: formData.currency || 'USD',
                hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
                manager_id: formData.managerId || null,
                monthly_capacity: formData.monthlyCapacity ? parseFloat(formData.monthlyCapacity) : 160,
                years_of_experience: formData.yearsOfExperience ? parseFloat(formData.yearsOfExperience) : null,
                hire_date: formData.hireDate || null,
                status: 'ACTIVE'
            });

            resetForm();
            setShowAddForm(false);
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to create employee');
        }
    };

    const toggleEditMode = () => {
        if (isEditMode) {
            // Exiting edit mode - clear all edits
            setEditData({});
        } else {
            // Entering edit mode - initialize editData with all current employee values
            const initialEditData: Record<string, Partial<Employee>> = {};
            employees.forEach((employee) => {
                initialEditData[employee.id] = {
                    first_name: employee.first_name,
                    last_name: employee.last_name,
                    email: employee.email,
                    employee_code: employee.employee_code,
                    position: employee.position,
                    department: employee.department,
                    level: employee.level,
                    salary: employee.salary,
                    currency: employee.currency,
                    hourly_rate: employee.hourly_rate,
                    manager_id: employee.manager_id,
                    monthly_capacity: employee.monthly_capacity,
                    years_of_experience: employee.years_of_experience,
                    hire_date: employee.hire_date,
                    status: employee.status,
                };
            });
            setEditData(initialEditData);
        }
        setIsEditMode(!isEditMode);
    };

    const saveAllEdits = async () => {
        try {
            // Save all edited employees
            for (const [id, data] of Object.entries(editData)) {
                await updateCompanyTable('employees', id, {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email || null,
                    employee_code: data.employee_code || null,
                    position: data.position || null,
                    department: data.department || null,
                    level: data.level || null,
                    salary: data.salary || null,
                    currency: data.currency || 'USD',
                    hourly_rate: data.hourly_rate || null,
                    manager_id: data.manager_id || null,
                    monthly_capacity: data.monthly_capacity || 160,
                    years_of_experience: data.years_of_experience || null,
                    hire_date: data.hire_date || null,
                    status: data.status || 'ACTIVE',
                });
            }
            setIsEditMode(false);
            setEditData({});
            fetchData();
        } catch (err: any) {
            alert('Failed to update employees: ' + err.message);
        }
    };

    const updateEmployeeField = (id: string, field: keyof Employee, value: any) => {
        setEditData((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete employee? This will affect all associated records.')) return;

        try {
            await deleteCompanyTable('employees', id);
            fetchData();
        } catch (err: any) {
            alert('Cannot delete employee: they may have associated time entries or be assigned to projects.');
        }
    };

    // Review-related handlers
    const handleOpenReviews = async (employee: Employee) => {
        setSelectedEmployeeForReviews(employee);
        setShowReviewsModal(true);
        await fetchEmployeeReviews(employee.id);
    };

    const fetchEmployeeReviews = async (employeeId: string) => {
        try {
            const schema = await getCompanySchema();
            const { data: revs, error } = await supabase
                .schema(schema)
                .from('employee_reviews')
                .select('*')
                .eq('employee_id', employeeId)
                .order('review_date', { ascending: false });

            if (error) throw error;

            const employeeMap = new Map(employees.map(e => [e.id, e]));
            const reviewsWithEmployees = (revs || []).map(review => ({
                ...review,
                employee: employeeMap.get(review.employee_id) || null,
                reviewer: employeeMap.get(review.reviewer_id) || null,
            }));

            setEmployeeReviews(reviewsWithEmployees);
        } catch (err: any) {
            console.error('Error fetching reviews:', err);
        }
    };

    const resetReviewForm = () => {
        setReviewFormData({
            employeeId: selectedEmployeeForReviews?.id || '',
            reviewDate: new Date().toISOString().split('T')[0],
            scorePresentation: '',
            scoreTimeManagement: '',
            scoreExcelSkills: '',
            scoreProficiency: '',
            scoreTransparency: '',
            scoreCreativity: '',
            scoreOverall: '',
            positiveSkills: [],
            improvementSkills: [],
            actionItems: '',
            employeeCommentary: '',
        });
        setNewPositiveSkill('');
        setNewImprovementSkill('');
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!reviewFormData.employeeId) {
            setError('Please select an employee');
            return;
        }

        if (!tenantId) {
            setError('Tenant ID not found. Please refresh the page.');
            return;
        }

        try {
            const reviewData = {
                employee_id: reviewFormData.employeeId,
                review_date: reviewFormData.reviewDate,
                score_presentation: reviewFormData.scorePresentation ? parseInt(reviewFormData.scorePresentation) : null,
                score_time_management: reviewFormData.scoreTimeManagement ? parseInt(reviewFormData.scoreTimeManagement) : null,
                score_excel_skills: reviewFormData.scoreExcelSkills ? parseInt(reviewFormData.scoreExcelSkills) : null,
                score_proficiency: reviewFormData.scoreProficiency ? parseInt(reviewFormData.scoreProficiency) : null,
                score_transparency: reviewFormData.scoreTransparency ? parseInt(reviewFormData.scoreTransparency) : null,
                score_creativity: reviewFormData.scoreCreativity ? parseInt(reviewFormData.scoreCreativity) : null,
                score_overall: reviewFormData.scoreOverall ? parseInt(reviewFormData.scoreOverall) : null,
                positive_skills: reviewFormData.positiveSkills,
                improvement_skills: reviewFormData.improvementSkills,
                action_items: reviewFormData.actionItems || null,
                employee_commentary: reviewFormData.employeeCommentary || null,
            };

            if (editingReviewId) {
                await updateCompanyTable('employee_reviews', editingReviewId, reviewData);
            } else {
                const schema = await getCompanySchema();
                const { data: { user } } = await supabase.auth.getUser();
                const { data: reviewer } = await supabase
                    .schema(schema)
                    .from('employees')
                    .select('id')
                    .eq('user_id', user?.id)
                    .single();

                await insertCompanyTable('employee_reviews', {
                    ...reviewData,
                    tenant_id: tenantId,
                    reviewer_id: reviewer?.id || null,
                });
            }

            resetReviewForm();
            setEditingReviewId(null);
            setShowAddReviewForm(false);
            if (selectedEmployeeForReviews) {
                await fetchEmployeeReviews(selectedEmployeeForReviews.id);
            }
            fetchData();
        } catch (err: any) {
            setError(err.message || (editingReviewId ? 'Failed to update review' : 'Failed to create review'));
        }
    };

    const handleDeleteReview = async (id: string) => {
        if (!confirm('Delete this review?')) return;
        try {
            await deleteCompanyTable('employee_reviews', id);
            if (selectedEmployeeForReviews) {
                await fetchEmployeeReviews(selectedEmployeeForReviews.id);
            }
            fetchData();
        } catch (err: any) {
            alert('Failed to delete review: ' + err.message);
        }
    };

    const handleEditReview = (review: EmployeeReview) => {
        setEditingReviewId(review.id);
        setReviewFormData({
            employeeId: review.employee_id,
            reviewDate: review.review_date,
            scorePresentation: review.score_presentation?.toString() || '',
            scoreTimeManagement: review.score_time_management?.toString() || '',
            scoreExcelSkills: review.score_excel_skills?.toString() || '',
            scoreProficiency: review.score_proficiency?.toString() || '',
            scoreTransparency: review.score_transparency?.toString() || '',
            scoreCreativity: review.score_creativity?.toString() || '',
            scoreOverall: review.score_overall?.toString() || '',
            positiveSkills: review.positive_skills || [],
            improvementSkills: review.improvement_skills || [],
            actionItems: review.action_items || '',
            employeeCommentary: review.employee_commentary || '',
        });
        setShowAddReviewForm(true);
    };

    const handleDownloadPdf = async (reviewId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');

        const token = session.access_token;
        const tenantIdValue = session.user.user_metadata?.company_id;

        try {
            const response = await axios.get(`http://localhost:3000/employee-reviews/${reviewId}/pdf`, {
                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantIdValue },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `employee-review-${reviewId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('PDF download failed');
        }
    };

    const addPositiveSkill = () => {
        if (newPositiveSkill.trim()) {
            setReviewFormData({
                ...reviewFormData,
                positiveSkills: [...reviewFormData.positiveSkills, newPositiveSkill.trim()]
            });
            setNewPositiveSkill('');
        }
    };

    const removePositiveSkill = (index: number) => {
        setReviewFormData({
            ...reviewFormData,
            positiveSkills: reviewFormData.positiveSkills.filter((_, i) => i !== index)
        });
    };

    const addImprovementSkill = () => {
        if (newImprovementSkill.trim()) {
            setReviewFormData({
                ...reviewFormData,
                improvementSkills: [...reviewFormData.improvementSkills, newImprovementSkill.trim()]
            });
            setNewImprovementSkill('');
        }
    };

    const removeImprovementSkill = (index: number) => {
        setReviewFormData({
            ...reviewFormData,
            improvementSkills: reviewFormData.improvementSkills.filter((_, i) => i !== index)
        });
    };

    const validateScore = (value: string): string => {
        if (value === '') return '';
        const num = parseInt(value);
        if (isNaN(num)) return '';
        if (num < 1) return '1';
        if (num > 100) return '100';
        return String(num);
    };

    // Filter employees based on status
    const filteredEmployees = statusFilter === 'ALL'
        ? employees
        : employees.filter(emp => emp.status === statusFilter);

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            {/* Header with Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Employees</h1>
                    <p style={{ color: '#64748b' }}>Manage your team members and their information.</p>
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
                                <Plus size={18} /> Add Employee
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Employees Table - Main Content */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>
                        {statusFilter === 'ALL' ? 'All Employees' : statusFilter === 'ACTIVE' ? 'Active Employees' : 'Inactive Employees'}
                        {' '}({filteredEmployees.length})
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Filter:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
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
                            <option value="INACTIVE">Inactive Only</option>
                            <option value="ALL">All Employees</option>
                        </select>
                    </div>
                </div>
                {filteredEmployees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p>No employees yet. Click "Add Employee" to create your first one.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>{isEditMode ? 'Delete' : 'Actions'}</th>
                                    <th>Name</th>
                                    <th>Position</th>
                                    <th>Department</th>
                                    <th>Level</th>
                                    <th>Manager</th>
                                    <th>Email</th>
                                    <th>Capacity</th>
                                    <th>Hire Date</th>
                                    <th>Status</th>
                                    <th>Previous Reviews</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map((employee) => {
                                    const employeeEdit = editData[employee.id] || {};
                                    return (
                                        <tr key={employee.id}>
                                            {isEditMode ? (
                                                <>
                                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                        <button onClick={() => handleDelete(employee.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <input
                                                                type="text"
                                                                value={employeeEdit.first_name || ''}
                                                                onChange={e => updateEmployeeField(employee.id, 'first_name', e.target.value)}
                                                                style={{ width: '70px', padding: '0.25rem' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                value={employeeEdit.last_name || ''}
                                                                onChange={e => updateEmployeeField(employee.id, 'last_name', e.target.value)}
                                                                style={{ width: '70px', padding: '0.25rem' }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={employeeEdit.position || ''}
                                                            onChange={e => updateEmployeeField(employee.id, 'position', e.target.value)}
                                                            style={{ width: '100px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={employeeEdit.department || ''}
                                                            onChange={e => updateEmployeeField(employee.id, 'department', e.target.value)}
                                                            style={{ width: '100px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={employeeEdit.level || ''}
                                                            onChange={e => updateEmployeeField(employee.id, 'level', e.target.value)}
                                                            style={{ width: '80px', padding: '0.25rem' }}
                                                        >
                                                            <option value="">-</option>
                                                            <option value="Junior">Junior</option>
                                                            <option value="Mid">Mid</option>
                                                            <option value="Senior">Senior</option>
                                                            <option value="Lead">Lead</option>
                                                            <option value="Principal">Principal</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={employeeEdit.manager_id || ''}
                                                            onChange={e => updateEmployeeField(employee.id, 'manager_id', e.target.value)}
                                                            style={{ width: '100px', padding: '0.25rem' }}
                                                        >
                                                            <option value="">-</option>
                                                            {employees.filter(e => e.id !== employee.id).map((emp) => (
                                                                <option key={emp.id} value={emp.id}>
                                                                    {emp.first_name} {emp.last_name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="email"
                                                            value={employeeEdit.email || ''}
                                                            onChange={e => updateEmployeeField(employee.id, 'email', e.target.value)}
                                                            style={{ width: '140px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={employeeEdit.monthly_capacity || ''}
                                                            onChange={e => updateEmployeeField(employee.id, 'monthly_capacity', e.target.value ? parseFloat(e.target.value) : null)}
                                                            style={{ width: '60px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="date"
                                                            value={employeeEdit.hire_date || ''}
                                                            onChange={e => updateEmployeeField(employee.id, 'hire_date', e.target.value)}
                                                            style={{ width: '120px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={employeeEdit.status || 'ACTIVE'}
                                                            onChange={e => updateEmployeeField(employee.id, 'status', e.target.value)}
                                                            style={{ width: '80px', padding: '0.25rem' }}
                                                        >
                                                            <option value="ACTIVE">ACTIVE</option>
                                                            <option value="INACTIVE">INACTIVE</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => handleOpenReviews(employee)}
                                                            className="btn"
                                                            style={{ padding: '0.25rem 0.75rem', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                                                            title="View Reviews"
                                                        >
                                                            <ClipboardCheck size={14} />
                                                            {reviewCounts[employee.id] || 0}
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button onClick={() => handleDelete(employee.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                <td style={{ fontWeight: 500 }}>
                                                    {employee.first_name} {employee.last_name}
                                                </td>
                                                <td>{employee.position || '-'}</td>
                                                <td>{employee.department || '-'}</td>
                                                <td>{employee.level || '-'}</td>
                                                <td>
                                                    {employee.manager ? (
                                                        <span>{employee.manager.first_name} {employee.manager.last_name}</span>
                                                    ) : '-'}
                                                </td>
                                                <td style={{ fontSize: '0.875rem' }}>{employee.email || '-'}</td>
                                                <td>{employee.monthly_capacity || 160} hrs</td>
                                                <td style={{ fontSize: '0.875rem' }}>
                                                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '999px',
                                                        fontSize: '0.75rem',
                                                        background: employee.status === 'ACTIVE' ? '#eef2ff' : '#fee2e2',
                                                        color: employee.status === 'ACTIVE' ? '#4338ca' : '#dc2626'
                                                    }}>
                                                        {employee.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => handleOpenReviews(employee)}
                                                        className="btn"
                                                        style={{ padding: '0.25rem 0.75rem', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                                                        title="View Reviews"
                                                    >
                                                        <ClipboardCheck size={14} />
                                                        {reviewCounts[employee.id] || 0}
                                                    </button>
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

            {/* Add Employee Modal */}
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
                                <Plus size={18} /> Add Employee
                            </h3>
                            <button onClick={() => { setShowAddForm(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Personal Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Personal Information</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>First Name *</label>
                                        <input type="text" placeholder="John" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Last Name *</label>
                                        <input type="text" placeholder="Doe" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                                        <input type="email" placeholder="john.doe@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee Code</label>
                                        <input type="text" placeholder="EMP-001" value={formData.employeeCode} onChange={e => setFormData({ ...formData, employeeCode: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Job Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Job Information</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Position</label>
                                        <input type="text" placeholder="Software Engineer" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Department</label>
                                        <input type="text" placeholder="Engineering" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Level</label>
                                        <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}>
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
                                        <select value={formData.managerId} onChange={e => setFormData({ ...formData, managerId: e.target.value })}>
                                            <option value="">No Manager</option>
                                            {employees.map((emp) => (
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
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Salary</label>
                                        <input type="number" step="0.01" placeholder="75000.00" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Hourly Rate</label>
                                        <input type="number" step="0.01" placeholder="50.00" value={formData.hourlyRate} onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })} />
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
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Monthly Capacity (hours)</label>
                                        <input type="number" step="0.01" placeholder="160" value={formData.monthlyCapacity} onChange={e => setFormData({ ...formData, monthlyCapacity: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Experience & Hiring */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Experience & Hiring</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Years of Experience</label>
                                        <input type="number" step="0.1" placeholder="5.5" value={formData.yearsOfExperience} onChange={e => setFormData({ ...formData, yearsOfExperience: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Hire Date</label>
                                        <input type="date" value={formData.hireDate} onChange={e => setFormData({ ...formData, hireDate: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} className="btn" style={{ background: '#e2e8f0' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={18} /> Add Employee
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Employee Reviews Modal */}
            {showReviewsModal && selectedEmployeeForReviews && (
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
                        maxWidth: '1200px',
                        width: '95%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ClipboardCheck size={20} />
                                Reviews for {selectedEmployeeForReviews.first_name} {selectedEmployeeForReviews.last_name}
                            </h3>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {!showAddReviewForm && (
                                    <button
                                        onClick={() => {
                                            resetReviewForm();
                                            setReviewFormData({ ...reviewFormData, employeeId: selectedEmployeeForReviews.id });
                                            setShowAddReviewForm(true);
                                        }}
                                        className="btn btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                    >
                                        <Plus size={16} /> New Review
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowReviewsModal(false);
                                        setSelectedEmployeeForReviews(null);
                                        setShowAddReviewForm(false);
                                        setEditingReviewId(null);
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {showAddReviewForm ? (
                            // Review Form
                            <>
                                {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}
                                <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Review Information</h4>
                                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Review Date</label>
                                                <input
                                                    type="date"
                                                    value={reviewFormData.reviewDate}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, reviewDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Performance Scores (1-100)</h4>
                                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Presentation</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="1-100"
                                                    value={reviewFormData.scorePresentation}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, scorePresentation: validateScore(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Time Management</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="1-100"
                                                    value={reviewFormData.scoreTimeManagement}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, scoreTimeManagement: validateScore(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Excel Skills</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="1-100"
                                                    value={reviewFormData.scoreExcelSkills}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, scoreExcelSkills: validateScore(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Proficiency</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="1-100"
                                                    value={reviewFormData.scoreProficiency}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, scoreProficiency: validateScore(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Transparency</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="1-100"
                                                    value={reviewFormData.scoreTransparency}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, scoreTransparency: validateScore(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Creativity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="1-100"
                                                    value={reviewFormData.scoreCreativity}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, scoreCreativity: validateScore(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Overall</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="1-100"
                                                    value={reviewFormData.scoreOverall}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, scoreOverall: validateScore(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Overall Review</h4>
                                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#16a34a' }}>Positive Skills</label>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Add a positive skill..."
                                                        value={newPositiveSkill}
                                                        onChange={e => setNewPositiveSkill(e.target.value)}
                                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addPositiveSkill())}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <button type="button" onClick={addPositiveSkill} className="btn" style={{ background: '#16a34a', color: 'white', padding: '0.5rem' }}>
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {reviewFormData.positiveSkills.map((skill, index) => (
                                                        <span key={index} style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            padding: '4px 8px',
                                                            background: '#dcfce7',
                                                            color: '#166534',
                                                            borderRadius: '999px',
                                                            fontSize: '0.875rem'
                                                        }}>
                                                            {skill}
                                                            <button
                                                                type="button"
                                                                onClick={() => removePositiveSkill(index)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#dc2626' }}>Areas for Improvement</label>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Add an improvement area..."
                                                        value={newImprovementSkill}
                                                        onChange={e => setNewImprovementSkill(e.target.value)}
                                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addImprovementSkill())}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <button type="button" onClick={addImprovementSkill} className="btn" style={{ background: '#dc2626', color: 'white', padding: '0.5rem' }}>
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {reviewFormData.improvementSkills.map((skill, index) => (
                                                        <span key={index} style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            padding: '4px 8px',
                                                            background: '#fee2e2',
                                                            color: '#dc2626',
                                                            borderRadius: '999px',
                                                            fontSize: '0.875rem'
                                                        }}>
                                                            {skill}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeImprovementSkill(index)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Additional Notes</h4>
                                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Action Items</label>
                                                <textarea
                                                    placeholder="Enter action items for the employee..."
                                                    value={reviewFormData.actionItems}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, actionItems: e.target.value })}
                                                    rows={4}
                                                    style={{ width: '100%', resize: 'vertical' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee Commentary</label>
                                                <textarea
                                                    placeholder="Enter employee's comments or feedback..."
                                                    value={reviewFormData.employeeCommentary}
                                                    onChange={e => setReviewFormData({ ...reviewFormData, employeeCommentary: e.target.value })}
                                                    rows={4}
                                                    style={{ width: '100%', resize: 'vertical' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddReviewForm(false);
                                                setEditingReviewId(null);
                                                resetReviewForm();
                                            }}
                                            className="btn"
                                            style={{ background: '#e2e8f0' }}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {editingReviewId ? <Pencil size={18} /> : <Plus size={18} />}
                                            {editingReviewId ? ' Update Review' : ' Create Review'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            // Reviews List
                            <div>
                                {employeeReviews.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        <p>No reviews yet for this employee.</p>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto', width: '100%' }}>
                                        <table style={{ width: '100%' }}>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Overall Score</th>
                                                    <th>Reviewer</th>
                                                    <th>Positive Skills</th>
                                                    <th>Improvement Areas</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {employeeReviews.map((review) => (
                                                    <tr key={review.id}>
                                                        <td>{new Date(review.review_date).toLocaleDateString()}</td>
                                                        <td>
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                                padding: '2px 8px',
                                                                borderRadius: '999px',
                                                                background: review.score_overall && review.score_overall >= 70 ? '#dcfce7' : '#fef9c3',
                                                                color: review.score_overall && review.score_overall >= 70 ? '#166534' : '#854d0e'
                                                            }}>
                                                                <Star size={14} /> {review.score_overall || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td>{review.reviewer?.first_name} {review.reviewer?.last_name}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '200px' }}>
                                                                {review.positive_skills?.slice(0, 2).map((skill, i) => (
                                                                    <span key={i} style={{
                                                                        padding: '2px 6px',
                                                                        background: '#dcfce7',
                                                                        color: '#166534',
                                                                        borderRadius: '999px',
                                                                        fontSize: '0.75rem'
                                                                    }}>{skill}</span>
                                                                ))}
                                                                {review.positive_skills && review.positive_skills.length > 2 && (
                                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>+{review.positive_skills.length - 2}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '200px' }}>
                                                                {review.improvement_skills?.slice(0, 2).map((skill, i) => (
                                                                    <span key={i} style={{
                                                                        padding: '2px 6px',
                                                                        background: '#fee2e2',
                                                                        color: '#dc2626',
                                                                        borderRadius: '999px',
                                                                        fontSize: '0.75rem'
                                                                    }}>{skill}</span>
                                                                ))}
                                                                {review.improvement_skills && review.improvement_skills.length > 2 && (
                                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>+{review.improvement_skills.length - 2}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                <button
                                                                    onClick={() => handleEditReview(review)}
                                                                    className="btn"
                                                                    style={{ padding: '0.25rem 0.5rem', background: '#f59e0b', color: 'white' }}
                                                                    title="Edit Review"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadPdf(review.id)}
                                                                    className="btn"
                                                                    style={{ padding: '0.25rem 0.5rem', background: '#3b82f6', color: 'white' }}
                                                                    title="Download PDF"
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteReview(review.id)}
                                                                    className="btn btn-danger"
                                                                    style={{ padding: '0.25rem 0.5rem' }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
