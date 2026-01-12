
'use client';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.scss';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        checkAuth();
    }, [router]);

    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
        }
        setLoading(false);
    }

    if (!mounted || loading) return null;

    return (
        <div className={styles.layout}>
            <Sidebar />
            <div className={styles.mainWrapper}>
                <Header />
                <main className={styles.mainContent}>
                    {children}
                </main>
            </div>
        </div>
    );
}
