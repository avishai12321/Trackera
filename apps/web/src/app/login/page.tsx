
'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('alice@acme.com');
    const [password, setPassword] = useState('password123');
    const [tenantId, setTenantId] = useState('08a38db9-0846-4d81-98ca-416c754ee4c9');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post('http://localhost:3000/auth/login', {
                email,
                password
            }, {
                headers: {
                    'x-tenant-id': tenantId
                }
            });

            const { accessToken, user } = res.data;

            // Store in localStorage
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('tenantId', tenantId);

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ width: '400px', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Login</h2>

                {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{String(error)}</div>}

                <form onSubmit={handleLogin}>
                    <label>Tenant ID</label>
                    <input
                        type="text"
                        value={tenantId}
                        onChange={e => setTenantId(e.target.value)}
                        required
                    />

                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
