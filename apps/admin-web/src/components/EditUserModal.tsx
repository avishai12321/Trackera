'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { User, Tenant, updateUser, getTenants } from '@/lib/api';

interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onUpdated: () => void;
}

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE'];

export default function EditUserModal({ user, onClose, onUpdated }: EditUserModalProps) {
    const [email, setEmail] = useState(user.email);
    const [status, setStatus] = useState(user.status);
    const [selectedTenantId, setSelectedTenantId] = useState(user.tenantId);
    const [selectedRole, setSelectedRole] = useState(user.roles.length > 0 ? user.roles[0].role : 'EMPLOYEE');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const data = await getTenants();
            setTenants(data);
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
        } finally {
            setLoadingTenants(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const updateData: any = {};

            if (email !== user.email) {
                updateData.email = email;
            }
            if (status !== user.status) {
                updateData.status = status;
            }
            if (selectedTenantId !== user.tenantId) {
                updateData.tenantId = selectedTenantId;
            }
            const currentRole = user.roles.length > 0 ? user.roles[0].role : '';
            if (selectedRole !== currentRole) {
                updateData.role = selectedRole;
            }

            if (Object.keys(updateData).length === 0) {
                onClose();
                return;
            }

            await updateUser(user.id, updateData);
            onUpdated();
        } catch (err: any) {
            console.error('Failed to update user:', err);
            setError(err.response?.data?.message || err.message || 'Failed to update user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit User</h2>
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
                            <label>Email *</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Tenant *</label>
                            <select
                                className="form-select"
                                value={selectedTenantId}
                                onChange={e => setSelectedTenantId(e.target.value)}
                                disabled={loadingTenants}
                                required
                            >
                                {loadingTenants ? (
                                    <option>Loading...</option>
                                ) : (
                                    tenants.map(tenant => (
                                        <option key={tenant.id} value={tenant.id}>
                                            {tenant.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Role *</label>
                            <select
                                className="form-select"
                                value={selectedRole}
                                onChange={e => setSelectedRole(e.target.value)}
                                required
                            >
                                {ROLES.map(role => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Status *</label>
                            <select
                                className="form-select"
                                value={status}
                                onChange={e => setStatus(e.target.value as 'ACTIVE' | 'DISABLED')}
                                required
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="DISABLED">DISABLED</option>
                            </select>
                        </div>

                        {user.employee && (
                            <div style={{
                                padding: '0.75rem',
                                background: '#f1f5f9',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                color: '#475569'
                            }}>
                                <strong>Linked Employee:</strong> {user.employee.first_name} {user.employee.last_name}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
