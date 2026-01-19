'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Trash2, X, Download, Star, Pencil } from 'lucide-react';
import { supabase, getCompanySchema, insertCompanyTable, updateCompanyTable, deleteCompanyTable } from '@/lib/supabase';
import axios from 'axios';

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    position: string | null;
    department: string | null;
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

export default function EmployeeReviews() {
    const router = useRouter();
    const [reviews, setReviews] = useState<EmployeeReview[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [error, setError] = useState('');
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
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

    // Temp inputs for skill lists
    const [newPositiveSkill, setNewPositiveSkill] = useState('');
    const [newImprovementSkill, setNewImprovementSkill] = useState('');

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

            // Fetch employees
            const { data: emps } = await supabase
                .schema(schema)
                .from('employees')
                .select('id, first_name, last_name, position, department')
                .eq('status', 'ACTIVE');

            setEmployees(emps || []);

            // Fetch reviews
            const { data: revs, error } = await supabase
                .schema(schema)
                .from('employee_reviews')
                .select('*')
                .order('review_date', { ascending: false });

            if (error) throw error;

            // Map employee data to reviews
            const employeeMap = new Map((emps || []).map(e => [e.id, e]));
            const reviewsWithEmployees = (revs || []).map(review => ({
                ...review,
                employee: employeeMap.get(review.employee_id) || null,
                reviewer: employeeMap.get(review.reviewer_id) || null,
            }));

            setReviews(reviewsWithEmployees);
        } catch (err: any) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            employeeId: '',
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.employeeId) {
            setError('Please select an employee');
            return;
        }

        if (!tenantId) {
            setError('Tenant ID not found. Please refresh the page.');
            return;
        }

        try {
            const reviewData = {
                employee_id: formData.employeeId,
                review_date: formData.reviewDate,
                score_presentation: formData.scorePresentation ? parseInt(formData.scorePresentation) : null,
                score_time_management: formData.scoreTimeManagement ? parseInt(formData.scoreTimeManagement) : null,
                score_excel_skills: formData.scoreExcelSkills ? parseInt(formData.scoreExcelSkills) : null,
                score_proficiency: formData.scoreProficiency ? parseInt(formData.scoreProficiency) : null,
                score_transparency: formData.scoreTransparency ? parseInt(formData.scoreTransparency) : null,
                score_creativity: formData.scoreCreativity ? parseInt(formData.scoreCreativity) : null,
                score_overall: formData.scoreOverall ? parseInt(formData.scoreOverall) : null,
                positive_skills: formData.positiveSkills,
                improvement_skills: formData.improvementSkills,
                action_items: formData.actionItems || null,
                employee_commentary: formData.employeeCommentary || null,
            };

            if (editingReviewId) {
                // Update existing review
                await updateCompanyTable('employee_reviews', editingReviewId, reviewData);
            } else {
                // Create new review
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

            resetForm();
            setEditingReviewId(null);
            setShowAddForm(false);
            fetchData();
        } catch (err: any) {
            setError(err.message || (editingReviewId ? 'Failed to update review' : 'Failed to create review'));
        }
    };

    const addPositiveSkill = () => {
        if (newPositiveSkill.trim()) {
            setFormData({
                ...formData,
                positiveSkills: [...formData.positiveSkills, newPositiveSkill.trim()]
            });
            setNewPositiveSkill('');
        }
    };

    const removePositiveSkill = (index: number) => {
        setFormData({
            ...formData,
            positiveSkills: formData.positiveSkills.filter((_, i) => i !== index)
        });
    };

    const addImprovementSkill = () => {
        if (newImprovementSkill.trim()) {
            setFormData({
                ...formData,
                improvementSkills: [...formData.improvementSkills, newImprovementSkill.trim()]
            });
            setNewImprovementSkill('');
        }
    };

    const removeImprovementSkill = (index: number) => {
        setFormData({
            ...formData,
            improvementSkills: formData.improvementSkills.filter((_, i) => i !== index)
        });
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

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this review?')) return;

        try {
            await deleteCompanyTable('employee_reviews', id);
            fetchData();
        } catch (err: any) {
            alert('Failed to delete review: ' + err.message);
        }
    };

    const handleEdit = (review: EmployeeReview) => {
        setEditingReviewId(review.id);
        setFormData({
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
        setShowAddForm(true);
    };

    const validateScore = (value: string): string => {
        if (value === '') return '';
        const num = parseInt(value);
        if (isNaN(num)) return '';
        if (num < 1) return '1';
        if (num > 100) return '100';
        return String(num);
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Employee Reviews</h1>
                    <p style={{ color: '#64748b' }}>Manage performance reviews for your team members.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} /> New Review
                </button>
            </div>

            {/* Reviews List */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <h3 style={{ marginBottom: '1rem' }}>All Reviews ({reviews.length})</h3>
                {reviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p>No reviews yet. Click "New Review" to create your first one.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Date</th>
                                    <th>Overall Score</th>
                                    <th>Reviewer</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.map((review) => (
                                    <tr key={review.id}>
                                        <td style={{ fontWeight: 500 }}>
                                            {review.employee?.first_name} {review.employee?.last_name}
                                        </td>
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
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button
                                                    onClick={() => handleEdit(review)}
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
                                                    onClick={() => handleDelete(review.id)}
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

            {/* Add Review Modal */}
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
                        maxWidth: '900px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {editingReviewId ? <Pencil size={18} /> : <Plus size={18} />}
                                {editingReviewId ? 'Edit Employee Review' : 'New Employee Review'}
                            </h3>
                            <button onClick={() => { setShowAddForm(false); setEditingReviewId(null); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Employee Selection */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Employee Information</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee *</label>
                                        <select
                                            value={formData.employeeId}
                                            onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map((emp) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.first_name} {emp.last_name} {emp.position ? `- ${emp.position}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Review Date</label>
                                        <input
                                            type="date"
                                            value={formData.reviewDate}
                                            onChange={e => setFormData({ ...formData, reviewDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Performance Scores */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Performance Scores (1-100)</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Presentation Skills</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="1-100"
                                            value={formData.scorePresentation}
                                            onChange={e => setFormData({ ...formData, scorePresentation: validateScore(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Time Management</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="1-100"
                                            value={formData.scoreTimeManagement}
                                            onChange={e => setFormData({ ...formData, scoreTimeManagement: validateScore(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Excel Skills</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="1-100"
                                            value={formData.scoreExcelSkills}
                                            onChange={e => setFormData({ ...formData, scoreExcelSkills: validateScore(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Proficiency</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="1-100"
                                            value={formData.scoreProficiency}
                                            onChange={e => setFormData({ ...formData, scoreProficiency: validateScore(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Transparency</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="1-100"
                                            value={formData.scoreTransparency}
                                            onChange={e => setFormData({ ...formData, scoreTransparency: validateScore(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Creativity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="1-100"
                                            value={formData.scoreCreativity}
                                            onChange={e => setFormData({ ...formData, scoreCreativity: validateScore(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Overall</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            placeholder="1-100"
                                            value={formData.scoreOverall}
                                            onChange={e => setFormData({ ...formData, scoreOverall: validateScore(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Overall Review - Positive Skills */}
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
                                            <button type="button" onClick={addPositiveSkill} className="btn" style={{ background: '#16a34a', color: 'white' }}>
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {formData.positiveSkills.map((skill, index) => (
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
                                            <button type="button" onClick={addImprovementSkill} className="btn" style={{ background: '#dc2626', color: 'white' }}>
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {formData.improvementSkills.map((skill, index) => (
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

                            {/* Action Items & Employee Commentary */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Additional Notes</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Action Items</label>
                                        <textarea
                                            placeholder="Enter action items for the employee..."
                                            value={formData.actionItems}
                                            onChange={e => setFormData({ ...formData, actionItems: e.target.value })}
                                            rows={4}
                                            style={{ width: '100%', resize: 'vertical' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee Commentary</label>
                                        <textarea
                                            placeholder="Enter employee's comments or feedback..."
                                            value={formData.employeeCommentary}
                                            onChange={e => setFormData({ ...formData, employeeCommentary: e.target.value })}
                                            rows={4}
                                            style={{ width: '100%', resize: 'vertical' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => { setShowAddForm(false); setEditingReviewId(null); resetForm(); }} className="btn" style={{ background: '#e2e8f0' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingReviewId ? <Pencil size={18} /> : <Plus size={18} />}
                                    {editingReviewId ? ' Update Review' : ' Create Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
