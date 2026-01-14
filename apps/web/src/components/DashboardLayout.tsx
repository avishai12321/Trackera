'use client';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.scss';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkAuth();
        // Load sidebar state from localStorage
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState) {
            setSidebarCollapsed(savedState === 'true');
        }
    }, [router]);

    const toggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', String(newState));
    };

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
            <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
            <div className={clsx(styles.mainWrapper, sidebarCollapsed && styles.sidebarCollapsed)}>
                <Header />
                <main className={styles.mainContent}>
                    {children}
                </main>
            </div>
        </div>
    );
}
