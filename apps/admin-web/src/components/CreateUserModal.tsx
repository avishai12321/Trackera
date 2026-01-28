'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { Tenant, Employee, getEmployeesByTenant, createUser } from '@/lib/api';

interface CreateUserModalProps {
    tenants: Tenant[];
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateUserModal({ tenants, onClose, onCreated }: CreateUserModalProps) {
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Email input for employees without email
    const [manualEmail, setManualEmail] = useState('');

    // For success state with password display
    const [createdPassword, setCreatedPassword] = useState<string | null>(null);
    const [createdEmail, setCreatedEmail] = useState<string>('');
    const [passwordVisible, setPasswordVisible] = useState(true);
    const [copied, setCopied] = useState(false);

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    const needsEmailInput = selectedEmployee && !selectedEmployee.email;

    useEffect(() => {
        if (selectedTenantId) {
            fetchEmployees(selectedTenantId);
        } else {
            setEmployees([]);
            setSelectedEmployeeId('');
        }
    }, [selectedTenantId]);

    useEffect(() => {
        // Reset manual email when employee changes
        setManualEmail('');
    }, [selectedEmployeeId]);

    const fetchEmployees = async (tenantId: string) => {
        setLoadingEmployees(true);
        setSelectedEmployeeId('');
        try {
            const data = await getEmployeesByTenant(tenantId);
            // Filter out employees that already have a user account
            const availableEmployees = data.filter(emp => !emp.user_id);
            setEmployees(availableEmployees);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
            setEmployees([]);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTenantId || !selectedEmployeeId) {
            setError('Please select a tenant and an employee');
            return;
        }

        // Determine final email
        const finalEmail = selectedEmployee?.email || manualEmail;
        if (!finalEmail) {
            setError('Please enter an email address');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const result = await createUser({
                tenantId: selectedTenantId,
                employeeId: selectedEmployeeId,
                email: needsEmailInput ? manualEmail : undefined,
            });

            // Show the generated password
            setCreatedPassword(result.password || null);
            setCreatedEmail(finalEmail);
        } catch (err: any) {
            console.error('Failed to create user:', err);
            setError(err.response?.data?.message || err.message || 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const copyToClipboard = async () => {
        if (!createdPassword) return;
        try {
            await navigator.clipboard.writeText(createdPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleDone = () => {
        onCreated();
    };

    // Success state - show password
    if (createdPassword) {
        return (
            <div className="modal-backdrop" onClick={handleDone}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>User Created Successfully</h2>
                        <button className="btn btn-ghost btn-icon" onClick={handleDone}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="modal-body">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                background: '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem'
                            }}>
                                <Check size={32} color="#16a34a" />
                            </div>
                            <p style={{ color: '#64748b' }}>
                                User account created for{' '}
                                <strong>{selectedEmployee?.first_name} {selectedEmployee?.last_name}</strong>
                            </p>
                        </div>

                        <div className="form-group">
                            <label>Email (Username)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={createdEmail}
                                readOnly
                            />
                        </div>

                        <div className="form-group">
                            <label>Generated Password</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type={passwordVisible ? 'text' : 'password'}
                                    className="form-input"
                                    value={createdPassword}
                                    readOnly
                                    style={{ fontFamily: 'monospace', flex: 1 }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-icon"
                                    onClick={() => setPasswordVisible(!passwordVisible)}
                                    title={passwordVisible ? 'Hide password' : 'Show password'}
                                >
                                    {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-icon"
                                    onClick={copyToClipboard}
                                    title="Copy password"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                                ⚠️ This password will only be shown once. Make sure to save it.
                            </p>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-primary" onClick={handleDone}>
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Form state
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create User</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div style={{
                                padding: '0.75rem',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '0.375rem',
                                marginBottom: '1rem',
                                color: '#dc2626',
                                fontSize: '0.875rem'
                            }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Tenant *</label>
                            <select
                                className="form-select"
                                value={selectedTenantId}
                                onChange={e => setSelectedTenantId(e.target.value)}
                                required
                            >
                                <option value="">Select a tenant...</option>
                                {tenants.map(tenant => (
                                    <option key={tenant.id} value={tenant.id}>
                                        {tenant.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Employee *</label>
                            <select
                                className="form-select"
                                value={selectedEmployeeId}
                                onChange={e => setSelectedEmployeeId(e.target.value)}
                                required
                                disabled={!selectedTenantId || loadingEmployees}
                            >
                                <option value="">
                                    {loadingEmployees
                                        ? 'Loading employees...'
                                        : !selectedTenantId
                                            ? 'Select a tenant first...'
                                            : employees.length === 0
                                                ? 'No available employees'
                                                : 'Select an employee...'
                                    }
                                </option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : '(no email)'}
                                    </option>
                                ))}
                            </select>
                            {selectedTenantId && !loadingEmployees && employees.length === 0 && (
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                                    All employees in this tenant already have user accounts.
                                </p>
                            )}
                        </div>

                        {needsEmailInput && (
                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={manualEmail}
                                    onChange={e => setManualEmail(e.target.value)}
                                    placeholder="Enter email address for this user..."
                                    required
                                />
                                <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                                    ⚠️ This employee doesn&apos;t have an email configured. Please provide one.
                                </p>
                            </div>
                        )}

                        <div style={{
                            padding: '0.75rem',
                            background: '#f1f5f9',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            color: '#475569'
                        }}>
                            <strong>Note:</strong> A password will be automatically generated and displayed after creation.
                            {!needsEmailInput && ' The email address of the employee will be used as the username.'}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting || !selectedTenantId || !selectedEmployeeId || (needsEmailInput && !manualEmail)}
                        >
                            {submitting ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
