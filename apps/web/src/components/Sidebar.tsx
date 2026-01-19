'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, Clock, Calendar, FolderKanban, LogOut, Upload, FileCheck, Users, Building2, ClipboardList, ChevronLeft, ChevronRight, FileText, ClipboardCheck } from 'lucide-react';
import styles from './Sidebar.module.scss';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase';

const mainMenuKeys = [
    { key: 'dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { key: 'employees', icon: Users, href: '/employees' },
    { key: 'employeeReview', icon: ClipboardCheck, href: '/employee-reviews' },
    { key: 'clients', icon: Building2, href: '/clients' },
    { key: 'projects', icon: FolderKanban, href: '/projects' },
    { key: 'timeAllocation', icon: ClipboardList, href: '/time-allocation' },
    { key: 'calendar', icon: Calendar, href: '/calendar' },
] as const;

const dataMenuKeys = [
    { key: 'timeEntries', icon: Clock, href: '/time-entries' },
    { key: 'reports', icon: FileText, href: '/reports' },
    { key: 'importData', icon: Upload, href: '/import' },
    { key: 'draftRecords', icon: FileCheck, href: '/drafts' },
] as const;

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations('sidebar');
    const tCommon = useTranslations('common');
    const tBrand = useTranslations('brand');

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
                    <span className={styles.logoTitle}>{tBrand('name')}</span>
                    <span className={styles.logoTagline}>{tBrand('tagline')}</span>
                </div>
            </div>

            <button onClick={onToggle} className={styles.collapseBtn} title={collapsed ? tCommon('expand') : tCommon('collapse')}>
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <nav className={styles.nav}>
                <div className={styles.menuSection}>
                    <div className={styles.sectionLabel}>{t('main')}</div>
                    {mainMenuKeys.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        const name = t(item.key);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(styles.link, isActive && styles.active)}
                                title={collapsed ? name : undefined}
                            >
                                <Icon size={18} />
                                <span>{name}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className={styles.menuSection}>
                    <div className={styles.sectionLabel}>{t('data')}</div>
                    {dataMenuKeys.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        const name = t(item.key);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(styles.link, isActive && styles.active, styles.grey)}
                                title={collapsed ? name : undefined}
                            >
                                <Icon size={18} />
                                <span>{name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className={styles.footer}>
                <button onClick={handleLogout} className={styles.logoutBtn} title={collapsed ? tCommon('logout') : undefined}>
                    <LogOut size={18} />
                    <span>{tCommon('logout')}</span>
                </button>
            </div>
        </aside>
    );
}
