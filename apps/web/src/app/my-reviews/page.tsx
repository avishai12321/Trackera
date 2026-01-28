'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Download, Star, Calendar as CalendarIcon } from 'lucide-react';
import { supabase, getCompanySchema } from '@/lib/supabase';
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
    reviewer?: Employee | null;
}

export default function MyReviews() {
    const router = useRouter();
    const [reviews, setReviews] = useState<EmployeeReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
    const [selectedReview, setSelectedReview] = useState<EmployeeReview | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return router.push('/login');

            const schema = await getCompanySchema();

            // Get current employee record linked to this user
            const { data: employee, error: empError } = await supabase
                .schema(schema)
                .from('employees')
                .select('id, first_name, last_name, position, department')
                .eq('user_id', session.user.id)
                .single();

            if (empError || !employee) {
                console.error('Employee not found for user:', empError);
                setLoading(false);
                return;
            }

            setCurrentEmployee(employee);

            // Fetch all employees for reviewer mapping
            const { data: allEmployees } = await supabase
                .schema(schema)
                .from('employees')
                .select('id, first_name, last_name, position, department');

            const employeeMap = new Map((allEmployees || []).map(e => [e.id, e]));

            // Fetch reviews for this employee
            const { data: revs, error } = await supabase
                .schema(schema)
                .from('employee_reviews')
                .select('*')
                .eq('employee_id', employee.id)
                .order('review_date', { ascending: false });

            if (error) throw error;

            const reviewsWithReviewers = (revs || []).map(review => ({
                ...review,
                reviewer: employeeMap.get(review.reviewer_id) || null,
            }));

            setReviews(reviewsWithReviewers);
        } catch (err: any) {
            console.error('Error fetching reviews:', err);
        } finally {
            setLoading(false);
        }
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
            link.setAttribute('download', `my-review-${reviewId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('PDF download failed');
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    if (!currentEmployee) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <h2 style={{ color: '#64748b', marginBottom: '1rem' }}>Employee Record Not Found</h2>
                    <p style={{ color: '#94a3b8' }}>
                        Your user account is not linked to an employee record. Please contact your administrator.
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1>My Performance Reviews</h1>
                <p style={{ color: '#64748b' }}>
                    View your performance review history and feedback from your managers.
                </p>
            </div>

            {/* Employee Info Card */}
            <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '0.5rem', color: 'white' }}>
                            {currentEmployee.first_name} {currentEmployee.last_name}
                        </h2>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
                            {currentEmployee.position || 'No position'} {currentEmployee.department ? `• ${currentEmployee.department}` : ''}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {reviews.length}
                        </div>
                        <div style={{ opacity: 0.9, fontSize: '0.875rem' }}>
                            Total Reviews
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Review History</h3>
                {reviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p>No reviews yet. Your performance reviews will appear here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {reviews.map((review) => (
                            <div
                                key={review.id}
                                className="card"
                                style={{
                                    background: selectedReview?.id === review.id ? '#f8fafc' : 'white',
                                    border: selectedReview?.id === review.id ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => setSelectedReview(selectedReview?.id === review.id ? null : review)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <CalendarIcon size={16} color="#64748b" />
                                            <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                                                {new Date(review.review_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                                            Reviewed by: {review.reviewer?.first_name} {review.reviewer?.last_name}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '999px',
                                                background: review.score_overall && review.score_overall >= 70 ? '#dcfce7' : '#fef9c3',
                                                color: review.score_overall && review.score_overall >= 70 ? '#166534' : '#854d0e',
                                                fontSize: '1.25rem',
                                                fontWeight: 'bold'
                                            }}>
                                                <Star size={20} fill="currentColor" /> {review.score_overall || 'N/A'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                Overall Score
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadPdf(review.id);
                                            }}
                                            className="btn"
                                            style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                            title="Download PDF"
                                        >
                                            <Download size={16} /> Download
                                        </button>
                                    </div>
                                </div>

                                {selectedReview?.id === review.id && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                        {/* Detailed Scores */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                                                Performance Scores
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                                {[
                                                    { label: 'Presentation', score: review.score_presentation },
                                                    { label: 'Time Management', score: review.score_time_management },
                                                    { label: 'Excel Skills', score: review.score_excel_skills },
                                                    { label: 'Proficiency', score: review.score_proficiency },
                                                    { label: 'Transparency', score: review.score_transparency },
                                                    { label: 'Creativity', score: review.score_creativity },
                                                ].map((item, idx) => (
                                                    <div key={idx} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                                            {item.label}
                                                        </div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                                                            {item.score || '-'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Positive Skills */}
                                        {review.positive_skills && review.positive_skills.length > 0 && (
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>
                                                    ✓ Strengths & Positive Skills
                                                </h4>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {review.positive_skills.map((skill, idx) => (
                                                        <span key={idx} style={{
                                                            padding: '0.5rem 0.75rem',
                                                            background: '#dcfce7',
                                                            color: '#166534',
                                                            borderRadius: '999px',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 500
                                                        }}>
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Improvement Areas */}
                                        {review.improvement_skills && review.improvement_skills.length > 0 && (
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#dc2626' }}>
                                                    → Areas for Growth
                                                </h4>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {review.improvement_skills.map((skill, idx) => (
                                                        <span key={idx} style={{
                                                            padding: '0.5rem 0.75rem',
                                                            background: '#fee2e2',
                                                            color: '#dc2626',
                                                            borderRadius: '999px',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 500
                                                        }}>
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Items */}
                                        {review.action_items && (
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                                                    Action Items
                                                </h4>
                                                <div style={{
                                                    padding: '1rem',
                                                    background: '#fef3c7',
                                                    borderLeft: '4px solid #f59e0b',
                                                    borderRadius: '4px'
                                                }}>
                                                    <p style={{ margin: 0, color: '#78350f', whiteSpace: 'pre-wrap' }}>
                                                        {review.action_items}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Employee Commentary */}
                                        {review.employee_commentary && (
                                            <div>
                                                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                                                    My Comments
                                                </h4>
                                                <div style={{
                                                    padding: '1rem',
                                                    background: '#dbeafe',
                                                    borderLeft: '4px solid #3b82f6',
                                                    borderRadius: '4px'
                                                }}>
                                                    <p style={{ margin: 0, color: '#1e3a8a', whiteSpace: 'pre-wrap' }}>
                                                        {review.employee_commentary}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
