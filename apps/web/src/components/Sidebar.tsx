'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Clock, Calendar, FolderKanban, LogOut, Upload, FileCheck, Users, Building2, ClipboardList, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import styles from './Sidebar.module.scss';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase';

const mainMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Employees', icon: Users, href: '/employees' },
    { name: 'Clients', icon: Building2, href: '/clients' },
    { name: 'Projects', icon: FolderKanban, href: '/projects' },
    { name: 'Time Allocation', icon: ClipboardList, href: '/time-allocation' },
    { name: 'Calendar', icon: Calendar, href: '/calendar' },
];

const dataMenuItems = [
    { name: 'Time Entries', icon: Clock, href: '/time-entries' },
    { name: 'Reports', icon: FileText, href: '/reports' },
    { name: 'Import Data', icon: Upload, href: '/import' },
    { name: 'Draft Records', icon: FileCheck, href: '/drafts' },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
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
        <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)}>
            <div className={styles.logo}>
                <Image
                    src="/logo-icon.svg"
                    alt="Trackera"
                    width={28}
                    height={34}
                    className={styles.logoIcon}
                />
                <div className={styles.logoText}>
                    <span className={styles.logoTitle}>TRACKERA</span>
                    <span className={styles.logoTagline}>TRACK LESS, KNOW MORE</span>
                </div>
            </div>

            <button onClick={onToggle} className={styles.collapseBtn} title={collapsed ? 'Expand' : 'Collapse'}>
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <nav className={styles.nav}>
                <div className={styles.menuSection}>
                    <div className={styles.sectionLabel}>Main</div>
                    {mainMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(styles.link, isActive && styles.active)}
                                title={collapsed ? item.name : undefined}
                            >
                                <Icon size={18} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className={styles.menuSection}>
                    <div className={styles.sectionLabel}>Data</div>
                    {dataMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(styles.link, isActive && styles.active, styles.grey)}
                                title={collapsed ? item.name : undefined}
                            >
                                <Icon size={18} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className={styles.footer}>
                <button onClick={handleLogout} className={styles.logoutBtn} title={collapsed ? 'Logout' : undefined}>
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
