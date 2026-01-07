
'use client';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.scss';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    if (!mounted) return null;

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
