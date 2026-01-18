
'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { signOut } from '@/lib/supabase';
import styles from './Header.module.scss';

export default function Header() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        <header className={styles.header}>
            <div className={styles.search}>
                <Search size={18} className={styles.searchIcon} />
                <input type="text" placeholder="Search..." />
            </div>

            <div className={styles.actions}>
                <button className={styles.iconBtn}>
                    <Bell size={20} />
                    <span className={styles.badge} />
                </button>
                <div className={styles.profile} ref={dropdownRef}>
                    <button
                        className={styles.avatar}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <User size={20} />
                    </button>
                    {isDropdownOpen && (
                        <div className={styles.dropdown}>
                            <button className={styles.dropdownItem} onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>Log out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
