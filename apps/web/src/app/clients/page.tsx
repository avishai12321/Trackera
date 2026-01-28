'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');

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

    // Edit state - now stores all client edits by ID
    const [editData, setEditData] = useState<Record<string, Partial<Client>>>({});

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

    const toggleEditMode = () => {
        if (isEditMode) {
            // Exiting edit mode - clear all edits
            setEditData({});
        } else {
            // Entering edit mode - initialize editData with all current client values
            const initialEditData: Record<string, Partial<Client>> = {};
            clients.forEach((client) => {
                const clientData: Partial<Client> = {
                    name: client.name,
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
                };

                // Only include code if it exists
                if (client.code !== undefined) {
                    clientData.code = client.code;
                }

                initialEditData[client.id] = clientData;
            });
            setEditData(initialEditData);
        }
        setIsEditMode(!isEditMode);
    };

    const saveAllEdits = async () => {
        try {
            // Save all edited clients
            for (const [id, data] of Object.entries(editData)) {
                const updateData: any = {
                    name: data.name,
                    email: data.email || null,
                    phone: data.phone || null,
                    contact_person: data.contact_person || null,
                    address: data.address || null,
                    city: data.city || null,
                    state: data.state || null,
                    postal_code: data.postal_code || null,
                    country: data.country || null,
                    company_registration_number: data.company_registration_number || null,
                    tax_id: data.tax_id || null,
                    vat_number: data.vat_number || null,
                    default_billing_rate: data.default_billing_rate || null,
                    currency: data.currency || 'USD',
                    payment_terms: data.payment_terms || null,
                    contract_start_date: data.contract_start_date || null,
                    contract_end_date: data.contract_end_date || null,
                    contract_notes: data.contract_notes || null,
                    status: data.status || 'ACTIVE',
                };

                // Only include code if it exists in the data (might not exist in schema)
                if ('code' in data) {
                    updateData.code = data.code || null;
                }

                await updateCompanyTable('clients', id, updateData);
            }
            setIsEditMode(false);
            setEditData({});
            fetchData();
        } catch (err: any) {
            alert('Failed to update clients: ' + err.message);
        }
    };

    const updateClientField = (id: string, field: keyof Client, value: any) => {
        setEditData((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete client? This will affect all associated projects.')) return;

        try {
            await deleteCompanyTable('clients', id);
            fetchData();
        } catch (err: any) {
            alert('Cannot delete client: it may have associated projects.');
        }
    };

    // Filter clients based on status
    const filteredClients = statusFilter === 'ALL'
        ? clients
        : clients.filter(client => client.status === statusFilter);

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            {/* Header with Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Clients</h1>
                    <p style={{ color: '#64748b' }}>Manage your client information and contracts.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isEditMode ? (
                        <>
                            <button
                                onClick={saveAllEdits}
                                className="btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white' }}
                            >
                                <Check size={18} /> Save All
                            </button>
                            <button
                                onClick={toggleEditMode}
                                className="btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#6b7280', color: 'white' }}
                            >
                                <X size={18} /> Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={toggleEditMode}
                                className="btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#6366f1', color: 'white' }}
                            >
                                <Edit2 size={18} /> Edit Mode
                            </button>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Plus size={18} /> Add Client
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Clients Table - Main Content */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>
                        {statusFilter === 'ALL' ? 'All Clients' : statusFilter === 'ACTIVE' ? 'Active Clients' : statusFilter === 'INACTIVE' ? 'Inactive Clients' : 'Archived Clients'}
                        {' '}({filteredClients.length})
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Filter:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED')}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                background: 'white'
                            }}
                        >
                            <option value="ACTIVE">Active Only</option>
                            <option value="INACTIVE">Inactive Only</option>
                            <option value="ARCHIVED">Archived Only</option>
                            <option value="ALL">All Clients</option>
                        </select>
                    </div>
                </div>
                {filteredClients.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p>No clients yet. Click "Add Client" to create your first one.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>{isEditMode ? 'Delete' : 'Actions'}</th>
                                    <th>Name</th>
                                    <th>Code</th>
                                    <th>Contact Person</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Location</th>
                                    <th>Billing Rate</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((client) => {
                                    const clientEdit = editData[client.id] || {};
                                    return (
                                        <tr key={client.id}>
                                            {isEditMode ? (
                                                <>
                                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                                        <button onClick={() => handleDelete(client.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={clientEdit.name || ''}
                                                            onChange={e => updateClientField(client.id, 'name', e.target.value)}
                                                            style={{ width: '120px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={clientEdit.code || ''}
                                                            onChange={e => updateClientField(client.id, 'code', e.target.value)}
                                                            style={{ width: '60px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={clientEdit.contact_person || ''}
                                                            onChange={e => updateClientField(client.id, 'contact_person', e.target.value)}
                                                            style={{ width: '100px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="email"
                                                            value={clientEdit.email || ''}
                                                            onChange={e => updateClientField(client.id, 'email', e.target.value)}
                                                            style={{ width: '140px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="tel"
                                                            value={clientEdit.phone || ''}
                                                            onChange={e => updateClientField(client.id, 'phone', e.target.value)}
                                                            style={{ width: '100px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="City"
                                                                value={clientEdit.city || ''}
                                                                onChange={e => updateClientField(client.id, 'city', e.target.value)}
                                                                style={{ width: '80px', padding: '0.25rem' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Country"
                                                                value={clientEdit.country || ''}
                                                                onChange={e => updateClientField(client.id, 'country', e.target.value)}
                                                                style={{ width: '80px', padding: '0.25rem' }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={clientEdit.default_billing_rate || ''}
                                                            onChange={e => updateClientField(client.id, 'default_billing_rate', e.target.value ? parseFloat(e.target.value) : null)}
                                                            style={{ width: '80px', padding: '0.25rem' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={clientEdit.status || 'ACTIVE'}
                                                            onChange={e => updateClientField(client.id, 'status', e.target.value)}
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
                                    );
                                })}
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
                                <Plus size={18} /> Add Client
                            </h3>
                            <button onClick={() => { setShowAddForm(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Basic Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Basic Information</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Name *</label>
                                        <input type="text" placeholder="Client Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Code</label>
                                        <input type="text" placeholder="CLI-001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Contact Person</label>
                                        <input type="text" placeholder="John Doe" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Contact Information</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                                        <input type="email" placeholder="client@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Phone</label>
                                        <input type="tel" placeholder="+1234567890" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Address</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Address</label>
                                        <input type="text" placeholder="123 Main St" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>City</label>
                                        <input type="text" placeholder="New York" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>State</label>
                                        <input type="text" placeholder="NY" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Postal Code</label>
                                        <input type="text" placeholder="10001" value={formData.postalCode} onChange={e => setFormData({ ...formData, postalCode: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Country</label>
                                        <input type="text" placeholder="USA" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Company Details */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Company Details</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Registration Number</label>
                                        <input type="text" placeholder="123456789" value={formData.companyRegistrationNumber} onChange={e => setFormData({ ...formData, companyRegistrationNumber: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Tax ID</label>
                                        <input type="text" placeholder="XX-XXXXXXX" value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>VAT Number</label>
                                        <input type="text" placeholder="EU123456789" value={formData.vatNumber} onChange={e => setFormData({ ...formData, vatNumber: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Billing Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Billing Information</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Default Billing Rate</label>
                                        <input type="number" step="0.01" placeholder="150.00" value={formData.defaultBillingRate} onChange={e => setFormData({ ...formData, defaultBillingRate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                        <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            <option value="ILS">ILS</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Payment Terms</label>
                                        <input type="text" placeholder="Net 30" value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Contract Information */}
                            <div>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Contract Information</h4>
                                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 2fr' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Contract Start Date</label>
                                        <input type="date" value={formData.contractStartDate} onChange={e => setFormData({ ...formData, contractStartDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Contract End Date</label>
                                        <input type="date" value={formData.contractEndDate} onChange={e => setFormData({ ...formData, contractEndDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Contract Notes</label>
                                        <input type="text" placeholder="Additional contract details..." value={formData.contractNotes} onChange={e => setFormData({ ...formData, contractNotes: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} className="btn" style={{ background: '#e2e8f0' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={18} /> Add Client
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
