'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ImportResult {
    employeesCreated: number;
    clientsCreated: number;
    projectsCreated: number;
    timeEntriesCreated: number;
    errors: string[];
    warnings: string[];
}

export default function Import() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
                setError('Please select an Excel file (.xlsx or .xls)');
                return;
            }
            setFile(selectedFile);
            setError('');
            setResult(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            if (!droppedFile.name.match(/\.(xlsx|xls)$/i)) {
                setError('Please drop an Excel file (.xlsx or .xls)');
                return;
            }
            setFile(droppedFile);
            setError('');
            setResult(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const tenantId = session.user.user_metadata?.company_id;
            if (!tenantId) {
                throw new Error('No company ID found in user metadata');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/import/excel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'x-tenant-id': tenantId,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Upload failed');
            }

            const data: ImportResult = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Failed to import data');
        } finally {
            setLoading(false);
        }
    };

    const totalCreated = result
        ? result.employeesCreated + result.clientsCreated + result.projectsCreated + result.timeEntriesCreated
        : 0;

    return (
        <DashboardLayout>
            <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
                    Import Data from Excel
                </h1>
                <p style={{ color: '#64748b', marginBottom: '32px' }}>
                    Upload an Excel file with employees, customers, projects, and time entries to bulk import data.
                </p>

                {/* File Upload Section */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    style={{
                        border: file ? '2px solid #22c55e' : '2px dashed #e2e8f0',
                        borderRadius: '12px',
                        padding: '48px 40px',
                        textAlign: 'center',
                        marginBottom: '24px',
                        background: file ? '#f0fdf4' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input
                        type="file"
                        id="file-upload"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    {file ? (
                        <>
                            <FileSpreadsheet size={56} style={{ margin: '0 auto 16px', color: '#22c55e' }} />
                            <p style={{ fontWeight: 600, color: '#22c55e', fontSize: '18px' }}>{file.name}</p>
                            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
                                {(file.size / 1024).toFixed(1)} KB - Click to change file
                            </p>
                        </>
                    ) : (
                        <>
                            <Upload size={56} style={{ margin: '0 auto 16px', color: '#94a3b8' }} />
                            <p style={{ fontWeight: 600, color: '#334155', fontSize: '18px' }}>
                                Drop your Excel file here
                            </p>
                            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
                                or click to browse
                            </p>
                        </>
                    )}
                </div>

                {/* Expected Format Info */}
                <div style={{
                    background: '#f1f5f9',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '24px',
                }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#334155' }}>
                        Expected Excel Format
                    </h3>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                        Your Excel file should have 4 sheets with the following columns:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <strong style={{ color: '#6366f1' }}>Sheet 1: employees</strong>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                name, first_report_date, last_report_date
                            </p>
                        </div>
                        <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <strong style={{ color: '#6366f1' }}>Sheet 2: customers</strong>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                name (customer name)
                            </p>
                        </div>
                        <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <strong style={{ color: '#6366f1' }}>Sheet 3: projects</strong>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                customer, project, project_key
                            </p>
                        </div>
                        <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <strong style={{ color: '#6366f1' }}>Sheet 4: time_entries</strong>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                date, employee, project_key, hours, minutes, description
                            </p>
                        </div>
                    </div>
                </div>

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: !file || loading ? '#94a3b8' : '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: !file || loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'background 0.2s ease',
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                            Importing data...
                        </>
                    ) : (
                        <>
                            <Upload size={22} />
                            Import Data
                        </>
                    )}
                </button>

                {/* Error Display */}
                {error && (
                    <div style={{
                        marginTop: '24px',
                        padding: '16px 20px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                    }}>
                        <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong>Import Error</strong>
                            <p style={{ marginTop: '4px', fontSize: '14px' }}>{error}</p>
                        </div>
                    </div>
                )}

                {/* Results Display */}
                {result && (
                    <div style={{ marginTop: '24px' }}>
                        {/* Success Summary */}
                        <div style={{
                            padding: '20px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            marginBottom: '16px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <CheckCircle size={28} style={{ color: '#22c55e' }} />
                                <div>
                                    <strong style={{ fontSize: '18px', color: '#166534' }}>Import Completed!</strong>
                                    <p style={{ color: '#15803d', fontSize: '14px' }}>
                                        {totalCreated} records created successfully
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>{result.employeesCreated}</div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Employees</div>
                                </div>
                                <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>{result.clientsCreated}</div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Clients</div>
                                </div>
                                <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>{result.projectsCreated}</div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Projects</div>
                                </div>
                                <div style={{ background: 'white', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>{result.timeEntriesCreated}</div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Time Entries</div>
                                </div>
                            </div>
                        </div>

                        {/* Warnings */}
                        {result.warnings.length > 0 && (
                            <div style={{
                                padding: '16px 20px',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: '8px',
                                marginBottom: '16px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <AlertTriangle size={20} style={{ color: '#d97706' }} />
                                    <strong style={{ color: '#92400e' }}>Warnings ({result.warnings.length})</strong>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '24px', fontSize: '14px', color: '#92400e', maxHeight: '150px', overflowY: 'auto' }}>
                                    {result.warnings.slice(0, 20).map((w, i) => (
                                        <li key={i} style={{ marginBottom: '4px' }}>{w}</li>
                                    ))}
                                    {result.warnings.length > 20 && (
                                        <li style={{ fontStyle: 'italic' }}>...and {result.warnings.length - 20} more warnings</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Errors */}
                        {result.errors.length > 0 && (
                            <div style={{
                                padding: '16px 20px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <AlertCircle size={20} style={{ color: '#dc2626' }} />
                                    <strong style={{ color: '#991b1b' }}>Errors ({result.errors.length})</strong>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '24px', fontSize: '14px', color: '#991b1b', maxHeight: '150px', overflowY: 'auto' }}>
                                    {result.errors.slice(0, 20).map((e, i) => (
                                        <li key={i} style={{ marginBottom: '4px' }}>{e}</li>
                                    ))}
                                    {result.errors.length > 20 && (
                                        <li style={{ fontStyle: 'italic' }}>...and {result.errors.length - 20} more errors</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Navigation */}
                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => router.push('/employees')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                View Employees
                            </button>
                            <button
                                onClick={() => router.push('/clients')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                View Clients
                            </button>
                            <button
                                onClick={() => router.push('/projects')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                View Projects
                            </button>
                        </div>
                    </div>
                )}

                {/* CSS for spinner animation */}
                <style jsx>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
