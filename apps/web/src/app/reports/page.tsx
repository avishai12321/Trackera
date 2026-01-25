
'use client';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import DashboardLayout from '../../components/DashboardLayout';
import { Download, FileSpreadsheet } from 'lucide-react';


export default function Reports() {
    const router = useRouter();
    const t = useTranslations('reports');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        const token = localStorage.getItem('accessToken');
        const tenantId = localStorage.getItem('tenantId');
        if (!token) return router.push('/login');

        setLoading(true);
        try {
            const response = await axios.get('http://localhost:3000/reports/export', {
                params: { format: 'csv', from, to },
                headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId },
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'report.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert(t('downloadFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>{t('title')}</h1>
                    <p style={{ color: '#64748b' }}>{t('subtitle')}</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '600px' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={18} /> {t('exportCSV')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('from')}</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('to')}</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} />
                    </div>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                >
                    {loading ? t('generating') : <><Download size={18} /> {t('downloadCSV')}</>}
                </button>
            </div>
        </DashboardLayout>
    );
}

