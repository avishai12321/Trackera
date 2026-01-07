
'use client';
import { Bell, Search, User } from 'lucide-react';
import styles from './Header.module.scss';

export default function Header() {
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
                <div className={styles.profile}>
                    <div className={styles.avatar}>
                        <User size={20} />
                    </div>
                </div>
            </div>
        </header>
    );
}
