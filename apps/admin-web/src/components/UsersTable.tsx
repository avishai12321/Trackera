'use client';

import { useState } from 'react';
import { Pencil, Trash2, KeyRound, Copy, Check } from 'lucide-react';
import { User, deleteUser, resetPassword } from '@/lib/api';
import EditUserModal from './EditUserModal';

interface UsersTableProps {
    users: User[];
    onUserUpdated: () => void;
    onUserDeleted: () => void;
}

export default function UsersTable({ users, onUserUpdated, onUserDeleted }: UsersTableProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    // Store reset passwords locally so they persist until page refresh
    const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

    const handleResetPassword = async (userId: string) => {
        if (!confirm('Are you sure you want to reset this user\'s password?')) return;

        setLoading(userId);
        try {
            const result = await resetPassword(userId);
            // Store the new password locally
            if (result.password) {
                setResetPasswords(prev => ({
                    ...prev,
                    [userId]: result.password
                }));
            }
            // Don't call onUserUpdated to avoid full refresh
        } catch (err) {
            console.error('Failed to reset password:', err);
            alert('Failed to reset password');
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (user: User) => {
        if (!confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) return;

        setLoading(user.id);
        try {
            await deleteUser(user.id);
            onUserDeleted();
        } catch (err) {
            console.error('Failed to delete user:', err);
            alert('Failed to delete user');
        } finally {
            setLoading(null);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleEditClose = () => {
        setEditingUser(null);
    };

    const handleEditSuccess = () => {
        setEditingUser(null);
        onUserUpdated();
    };

    // Helper to get password - from reset state or from user data
    const getPassword = (user: User): string | null => {
        return resetPasswords[user.id] || user.password || null;
    };

    if (users.length === 0) {
        return (
            <div className="empty-state">
                <p>No users found. Create your first user to get started.</p>
            </div>
        );
    }

    return (
        <>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Tenant</th>
                            <th>Employee</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Password</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{user.email}</div>
                                </td>
                                <td>{user.tenantName}</td>
                                <td>
                                    {user.employee ? (
                                        `${user.employee.first_name} ${user.employee.last_name}`
                                    ) : (
                                        <span className="text-muted">—</span>
                                    )}
                                </td>
                                <td>
                                    {user.roles.length > 0 ? (
                                        <span className="badge badge-neutral">
                                            {user.roles[0].role}
                                        </span>
                                    ) : (
                                        <span className="text-muted">—</span>
                                    )}
                                </td>
                                <td>
                                    <span
                                        className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}
                                    >
                                        {user.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="password-display">
                                        {(() => {
                                            const password = getPassword(user);
                                            return password ? (
                                                <>
                                                    <span className="password-text">{password}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(password, user.id)}
                                                        title="Copy password"
                                                    >
                                                        {copiedId === user.id ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="password-hidden" title="Reset password to generate and view">
                                                    Click reset to set
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </td>
                                <td>
                                    <div className="actions-cell">
                                        <button
                                            className="btn btn-ghost btn-sm btn-icon"
                                            onClick={() => setEditingUser(user)}
                                            disabled={loading === user.id}
                                            title="Edit User"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm btn-icon"
                                            onClick={() => handleResetPassword(user.id)}
                                            disabled={loading === user.id}
                                            title="Reset Password"
                                        >
                                            <KeyRound size={14} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm btn-icon"
                                            onClick={() => handleDelete(user)}
                                            disabled={loading === user.id}
                                            title="Delete User"
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

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={handleEditClose}
                    onUpdated={handleEditSuccess}
                />
            )}
        </>
    );
}
