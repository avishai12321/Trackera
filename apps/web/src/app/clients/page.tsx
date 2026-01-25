'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { supabase, getCompanySchema, insertCompanyTable, updateCompanyTable, deleteCompanyTable } from '@/lib/supabase';

interface Client {
    id: string;
    name: string;
    code: string | null;
    email: string | null;
    phone: string | null;
    contact_person: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    company_registration_number: string | null;
    tax_id: string | null;
    vat_number: string | null;
    default_billing_rate: number | null;
    currency: string | null;
    payment_terms: string | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
    contract_notes: string | null;
    status: string;
}

export default function Clients() {
    const router = useRouter();
    const t = useTranslations('clients');
    const tCommon = useTranslations('common');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state for adding
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        email: '',
        phone: '',
        contactPerson: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        companyRegistrationNumber: '',
        taxId: '',
        vatNumber: '',
        defaultBillingRate: '',
        currency: 'USD',
        paymentTerms: '',
        contractStartDate: '',
        contractEndDate: '',
        contractNotes: '',
    });

    // Edit state
    const [editData, setEditData] = useState<Partial<Client>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return router.push('/login');

            const schema = await getCompanySchema();
            const { data, error } = await supabase
                .schema(schema)
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (err: any) {
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            email: '',
            phone: '',
            contactPerson: '',
            address: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
            companyRegistrationNumber: '',
            taxId: '',
            vatNumber: '',
            defaultBillingRate: '',
            currency: 'USD',
            paymentTerms: '',
            contractStartDate: '',
            contractEndDate: '',
            contractNotes: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await insertCompanyTable('clients', {
                name: formData.name,
                code: formData.code || null,
                email: formData.email || null,
                phone: formData.phone || null,
                contact_person: formData.contactPerson || null,
                address: formData.address || null,
                city: formData.city || null,
                state: formData.state || null,
                postal_code: formData.postalCode || null,
                country: formData.country || null,
                company_registration_number: formData.companyRegistrationNumber || null,
                tax_id: formData.taxId || null,
                vat_number: formData.vatNumber || null,
                default_billing_rate: formData.defaultBillingRate ? parseFloat(formData.defaultBillingRate) : null,
                currency: formData.currency || 'USD',
                payment_terms: formData.paymentTerms || null,
                contract_start_date: formData.contractStartDate || null,
                contract_end_date: formData.contractEndDate || null,
                contract_notes: formData.contractNotes || null,
                status: 'ACTIVE'
            });

            resetForm();
            setShowAddForm(false);
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to create client');
        }
    };

    const startEdit = (client: Client) => {
        setEditingId(client.id);
        setEditData({
            name: client.name,
            code: client.code,
            email: client.email,
            phone: client.phone,
            contact_person: client.contact_person,
            address: client.address,
            city: client.city,
            state: client.state,
            postal_code: client.postal_code,
            country: client.country,
            company_registration_number: client.company_registration_number,
            tax_id: client.tax_id,
            vat_number: client.vat_number,
            default_billing_rate: client.default_billing_rate,
            currency: client.currency,
            payment_terms: client.payment_terms,
            contract_start_date: client.contract_start_date,
            contract_end_date: client.contract_end_date,
            contract_notes: client.contract_notes,
            status: client.status,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = async (id: string) => {
        try {
            await updateCompanyTable('clients', id, {
                name: editData.name,
                code: editData.code || null,
                email: editData.email || null,
                phone: editData.phone || null,
                contact_person: editData.contact_person || null,
                address: editData.address || null,
                city: editData.city || null,
                state: editData.state || null,
                postal_code: editData.postal_code || null,
                country: editData.country || null,
                company_registration_number: editData.company_registration_number || null,
                tax_id: editData.tax_id || null,
                vat_number: editData.vat_number || null,
                default_billing_rate: editData.default_billing_rate || null,
                currency: editData.currency || 'USD',
                payment_terms: editData.payment_terms || null,
                contract_start_date: editData.contract_start_date || null,
                contract_end_date: editData.contract_end_date || null,
                contract_notes: editData.contract_notes || null,
                status: editData.status || 'ACTIVE',
            });
            setEditingId(null);
            setEditData({});
            fetchData();
        } catch (err: any) {
            alert('Failed to update client: ' + err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;

        try {
            await deleteCompanyTable('clients', id);
            fetchData();
        } catch (err: any) {
            alert('Cannot delete client: it may have associated projects.');
        }
    };

    if (loading) return <DashboardLayout><div>{tCommon('loading')}</div></DashboardLayout>;

    return (
        <DashboardLayout>
            {/* Header with Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>{t('title')}</h1>
                    <p style={{ color: '#64748b' }}>{t('subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} /> {t('addClient')}
                </button>
            </div>

            {/* Clients Table - Main Content */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <h3 style={{ marginBottom: '1rem' }}>{t('allClients')} ({clients.length})</h3>
                {clients.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p>{t('noClients')}</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>{tCommon('actions')}</th>
                                    <th>{tCommon('name')}</th>
                                    <th>{tCommon('code')}</th>
                                    <th>{t('contactPerson')}</th>
                                    <th>{tCommon('email')}</th>
                                    <th>{t('phone')}</th>
                                    <th>{t('location')}</th>
                                    <th>{t('billingRate')}</th>
                                    <th>{tCommon('status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((client) => (
                                    <tr key={client.id}>
                                        {editingId === client.id ? (
                                            <>
                                                <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button onClick={() => saveEdit(client.id)} className="btn" style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: 'white' }}>
                                                            <Check size={14} />
                                                        </button>
                                                        <button onClick={cancelEdit} className="btn" style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white' }}>
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={editData.name || ''}
                                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                                        style={{ width: '120px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={editData.code || ''}
                                                        onChange={e => setEditData({ ...editData, code: e.target.value })}
                                                        style={{ width: '60px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={editData.contact_person || ''}
                                                        onChange={e => setEditData({ ...editData, contact_person: e.target.value })}
                                                        style={{ width: '100px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="email"
                                                        value={editData.email || ''}
                                                        onChange={e => setEditData({ ...editData, email: e.target.value })}
                                                        style={{ width: '140px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="tel"
                                                        value={editData.phone || ''}
                                                        onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                                        style={{ width: '100px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="City"
                                                            value={editData.city || ''}
                                                            onChange={e => setEditData({ ...editData, city: e.target.value })}
                                                            style={{ width: '80px', padding: '0.25rem' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Country"
                                                            value={editData.country || ''}
                                                            onChange={e => setEditData({ ...editData, country: e.target.value })}
                                                            style={{ width: '80px', padding: '0.25rem' }}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={editData.default_billing_rate || ''}
                                                        onChange={e => setEditData({ ...editData, default_billing_rate: e.target.value ? parseFloat(e.target.value) : null })}
                                                        style={{ width: '80px', padding: '0.25rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        value={editData.status || 'ACTIVE'}
                                                        onChange={e => setEditData({ ...editData, status: e.target.value })}
                                                        style={{ width: '80px', padding: '0.25rem' }}
                                                    >
                                                        <option value="ACTIVE">ACTIVE</option>
                                                        <option value="INACTIVE">INACTIVE</option>
                                                        <option value="ARCHIVED">ARCHIVED</option>
                                                    </select>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button onClick={() => startEdit(client)} className="btn" style={{ padding: '0.25rem 0.5rem', background: '#6366f1', color: 'white' }}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(client.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 500 }}>{client.name}</td>
                                                <td>
                                                    {client.code ? (
                                                        <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                            {client.code}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td>{client.contact_person || '-'}</td>
                                                <td style={{ fontSize: '0.875rem' }}>{client.email || '-'}</td>
                                                <td style={{ fontSize: '0.875rem' }}>{client.phone || '-'}</td>
                                                <td style={{ fontSize: '0.875rem' }}>
                                                    {client.city || client.country ? (
                                                        <>
                                                            {client.city && <span>{client.city}</span>}
                                                            {client.city && client.country && ', '}
                                                            {client.country && <span>{client.country}</span>}
                                                        </>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    {client.default_billing_rate ? (
                                                        <span>{client.currency || 'USD'} {parseFloat(String(client.default_billing_rate)).toFixed(2)}/hr</span>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '999px',
                                                        fontSize: '0.75rem',
                                                        background: client.status === 'ACTIVE' ? '#eef2ff' : client.status === 'INACTIVE' ? '#fee2e2' : '#f3f4f6',
                                                        color: client.status === 'ACTIVE' ? '#4338ca' : client.status === 'INACTIVE' ? '#dc2626' : '#4b5563'
                                                    }}>
                                                        {client.status}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Client Modal */}
            {showAddForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '2rem',
                        maxWidth: '900px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Plus size={18} /> {t('addClient')}
                            </h3>
                            <button onClick={() => { setShowAddForm(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Basic Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{t('basicInfo')}</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{tCommon('name')} *</label>
                                        <input type="text" placeholder="Client Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{tCommon('code')}</label>
                                        <input type="text" placeholder="CLI-001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('contactPerson')}</label>
                                        <input type="text" placeholder="John Doe" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{t('contactInfo')}</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{tCommon('email')}</label>
                                        <input type="email" placeholder="client@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('phone')}</label>
                                        <input type="tel" placeholder="+1234567890" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{t('address')}</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('address')}</label>
                                        <input type="text" placeholder="123 Main St" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('city')}</label>
                                        <input type="text" placeholder="New York" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('state')}</label>
                                        <input type="text" placeholder="NY" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('postalCode')}</label>
                                        <input type="text" placeholder="10001" value={formData.postalCode} onChange={e => setFormData({ ...formData, postalCode: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('country')}</label>
                                        <input type="text" placeholder="USA" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Company Details */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{t('companyDetails')}</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('registrationNumber')}</label>
                                        <input type="text" placeholder="123456789" value={formData.companyRegistrationNumber} onChange={e => setFormData({ ...formData, companyRegistrationNumber: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('taxId')}</label>
                                        <input type="text" placeholder="XX-XXXXXXX" value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('vatNumber')}</label>
                                        <input type="text" placeholder="EU123456789" value={formData.vatNumber} onChange={e => setFormData({ ...formData, vatNumber: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Billing Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{t('billingInfo')}</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('defaultBillingRate')}</label>
                                        <input type="number" step="0.01" placeholder="150.00" value={formData.defaultBillingRate} onChange={e => setFormData({ ...formData, defaultBillingRate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('currency')}</label>
                                        <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            <option value="ILS">ILS</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('paymentTerms')}</label>
                                        <input type="text" placeholder="Net 30" value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Contract Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{t('contractInfo')}</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 2fr' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('contractStartDate')}</label>
                                        <input type="date" value={formData.contractStartDate} onChange={e => setFormData({ ...formData, contractStartDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('contractEndDate')}</label>
                                        <input type="date" value={formData.contractEndDate} onChange={e => setFormData({ ...formData, contractEndDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('contractNotes')}</label>
                                        <input type="text" placeholder="Additional contract details..." value={formData.contractNotes} onChange={e => setFormData({ ...formData, contractNotes: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} className="btn" style={{ background: '#e2e8f0' }}>
                                    {tCommon('cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={18} /> {t('addClient')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
