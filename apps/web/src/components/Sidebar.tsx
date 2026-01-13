
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Clock, Calendar, FileText, FolderKanban, LogOut, Upload, FileCheck, Users, Building2, ClipboardList } from 'lucide-react';
import styles from './Sidebar.module.scss';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase';

const coreMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Employees', icon: Users, href: '/employees' },
    { name: 'Clients', icon: Building2, href: '/clients' },
    { name: 'Projects', icon: FolderKanban, href: '/projects' },
    { name: 'Time Allocation', icon: ClipboardList, href: '/time-allocation' },
];

const extraMenuItems = [
    { name: 'Time Entries', icon: Clock, href: '/time-entries', grey: true },
    { name: 'Calendar', icon: Calendar, href: '/calendar', grey: true },
    { name: 'Reports', icon: FileText, href: '/reports', grey: true },
    { name: 'Import Data', icon: Upload, href: '/import', grey: true },
    { name: 'Draft Records', icon: FileCheck, href: '/drafts', grey: true },
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
                <span>Trackera</span>
            </div>

            <nav className={styles.nav}>
                <div className={styles.menuSection}>
                    {coreMenuItems.map((item) => {
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
                </div>

                <div className={styles.menuSection}>
                    {extraMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(styles.link, isActive && styles.active, item.grey && styles.grey)}
                            >
                                <Icon size={20} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
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
