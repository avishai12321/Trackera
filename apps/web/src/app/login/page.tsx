'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signIn } from '@/lib/supabase';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('admin@testcompany.com');
    const [password, setPassword] = useState('TestPassword123!');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signIn(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
            <div style={{ width: '400px', padding: '2.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {/* Logo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                    <Image
                        src="/logo-icon.svg"
                        alt="Trackera"
                        width={56}
                        height={68}
                        style={{ marginBottom: '1rem' }}
                    />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.15em', margin: 0 }}>TRACKERA</h1>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', letterSpacing: '0.1em' }}>TRACK LESS, KNOW MORE</span>
                </div>

                {error && <div style={{ color: '#dc2626', marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '6px', fontSize: '0.875rem' }}>{String(error)}</div>}

                <form onSubmit={handleLogin}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={{ marginBottom: '1rem' }}
                    />

                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{ marginBottom: '1.5rem' }}
                    />

                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
