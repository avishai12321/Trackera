
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Clock, Calendar, FileText, FolderKanban, Settings, LogOut, Upload, FileCheck } from 'lucide-react';
import styles from './Sidebar.module.scss';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Time Entries', icon: Clock, href: '/time-entries' },
    { name: 'Calendar', icon: Calendar, href: '/calendar' },
    { name: 'Reports', icon: FileText, href: '/reports' },
    { name: 'Projects', icon: FolderKanban, href: '/projects' },
    { name: 'Import Data', icon: Upload, href: '/import' },
    { name: 'Draft Records', icon: FileCheck, href: '/drafts' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut();
            localStorage.clear();
            router.push('/login');
        } catch (err) {
            console.error('Logout error:', err);
            localStorage.clear();
            router.push('/login');
        }
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <div className={styles.logoIcon} />
                <span>TimeTracker</span>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(styles.link, isActive && styles.active)}
                        >
                            <Icon size={20} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
