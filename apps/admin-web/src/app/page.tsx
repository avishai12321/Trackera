'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { getUsers, getTenants, User, Tenant } from '@/lib/api';
import UsersTable from '@/components/UsersTable';
import CreateUserModal from '@/components/CreateUserModal';

export default function HomePage() {
    const [users, setUsers] = useState<User[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersData, tenantsData] = await Promise.all([
                getUsers(),
                getTenants(),
            ]);
            setUsers(usersData);
            setTenants(tenantsData);
        } catch (err: any) {
            console.error('Failed to fetch data:', err);
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUserCreated = () => {
        setShowCreateModal(false);
        fetchData();
    };

    const handleUserUpdated = () => {
        fetchData();
    };

    const handleUserDeleted = () => {
        fetchData();
    };

    return (
        <div className="container">
            <div className="page-header">
                <h1>User Management</h1>
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-secondary btn-icon"
                        onClick={fetchData}
                        disabled={loading}
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={16} />
                        Create User
                    </button>
                </div>
            </div>

            {error && (
                <div className="card mb-4" style={{ padding: '1rem', background: '#fef2f2', borderColor: '#fecaca' }}>
                    <p className="text-danger">{error}</p>
                </div>
            )}

            <div className="card">
                {loading ? (
                    <div className="loading">Loading users...</div>
                ) : (
                    <UsersTable
                        users={users}
                        onUserUpdated={handleUserUpdated}
                        onUserDeleted={handleUserDeleted}
                    />
                )}
            </div>

            {showCreateModal && (
                <CreateUserModal
                    tenants={tenants}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={handleUserCreated}
                />
            )}
        </div>
    );
}
