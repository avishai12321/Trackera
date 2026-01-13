'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { supabase, getCompanySchema, insertCompanyTable, deleteCompanyTable } from '@/lib/supabase';

export default function Clients() {
    const router = useRouter();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
    const [taxId, setTaxId] = useState('');
    const [vatNumber, setVatNumber] = useState('');
    const [defaultBillingRate, setDefaultBillingRate] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [contractStartDate, setContractStartDate] = useState('');
    const [contractEndDate, setContractEndDate] = useState('');
    const [contractNotes, setContractNotes] = useState('');

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const { error } = await insertCompanyTable('clients', {
                name,
                code: code || null,
                email: email || null,
                phone: phone || null,
                contact_person: contactPerson || null,
                address: address || null,
                city: city || null,
                state: state || null,
                postal_code: postalCode || null,
                country: country || null,
                company_registration_number: companyRegistrationNumber || null,
                tax_id: taxId || null,
                vat_number: vatNumber || null,
                default_billing_rate: defaultBillingRate ? parseFloat(defaultBillingRate) : null,
                currency: currency || 'USD',
                payment_terms: paymentTerms || null,
                contract_start_date: contractStartDate || null,
                contract_end_date: contractEndDate || null,
                contract_notes: contractNotes || null,
                status: 'ACTIVE'
            });

            if (error) throw error;

            // Reset form
            setName('');
            setCode('');
            setEmail('');
            setPhone('');
            setContactPerson('');
            setAddress('');
            setCity('');
            setState('');
            setPostalCode('');
            setCountry('');
            setCompanyRegistrationNumber('');
            setTaxId('');
            setVatNumber('');
            setDefaultBillingRate('');
            setCurrency('USD');
            setPaymentTerms('');
            setContractStartDate('');
            setContractEndDate('');
            setContractNotes('');

            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to create client');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete client? This will affect all associated projects.')) return;

        try {
            const { error } = await deleteCompanyTable('clients', id);
            if (error) throw error;
            fetchData();
        } catch (err: any) {
            alert('Cannot delete client: it may have associated projects.');
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Clients</h1>
                    <p style={{ color: '#64748b' }}>Manage your client information and contracts.</p>
                </div>
            </div>

            {/* Add Client Form */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Add Client
                </h3>
                {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{String(error)}</p>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Basic Information */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Basic Information</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Name *</label>
                                <input type="text" placeholder="Client Name" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Code</label>
                                <input type="text" placeholder="CLI-001" value={code} onChange={e => setCode(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Contact Person</label>
                                <input type="text" placeholder="John Doe" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Contact Information</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                                <input type="email" placeholder="client@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Phone</label>
                                <input type="tel" placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Address</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Address</label>
                                <input type="text" placeholder="123 Main St" value={address} onChange={e => setAddress(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>City</label>
                                <input type="text" placeholder="New York" value={city} onChange={e => setCity(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>State</label>
                                <input type="text" placeholder="NY" value={state} onChange={e => setState(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Postal Code</label>
                                <input type="text" placeholder="10001" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Country</label>
                                <input type="text" placeholder="USA" value={country} onChange={e => setCountry(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Company Details */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Company Details</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Registration Number</label>
                                <input type="text" placeholder="123456789" value={companyRegistrationNumber} onChange={e => setCompanyRegistrationNumber(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Tax ID</label>
                                <input type="text" placeholder="XX-XXXXXXX" value={taxId} onChange={e => setTaxId(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>VAT Number</label>
                                <input type="text" placeholder="EU123456789" value={vatNumber} onChange={e => setVatNumber(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Billing Information */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Billing Information</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Default Billing Rate</label>
                                <input type="number" step="0.01" placeholder="150.00" value={defaultBillingRate} onChange={e => setDefaultBillingRate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Currency</label>
                                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="ILS">ILS</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Payment Terms</label>
                                <input type="text" placeholder="Net 30" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Contract Information */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Contract Information</h4>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 2fr' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Contract Start Date</label>
                                <input type="date" value={contractStartDate} onChange={e => setContractStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Contract End Date</label>
                                <input type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Contract Notes</label>
                                <input type="text" placeholder="Additional contract details..." value={contractNotes} onChange={e => setContractNotes(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={18} /> Add Client
                        </button>
                    </div>
                </form>
            </div>

            {/* Clients Table */}
            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>All Clients</h3>
                <div className="table-container" style={{ border: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Contact Person</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((client: any) => (
                                <tr key={client.id}>
                                    <td style={{ fontWeight: 500 }}>{client.name}</td>
                                    <td>
                                        {client.code && (
                                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                {client.code}
                                            </span>
                                        )}
                                    </td>
                                    <td>{client.contact_person || '-'}</td>
                                    <td>{client.email || '-'}</td>
                                    <td>{client.phone || '-'}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            background: client.status === 'ACTIVE' ? '#dbeafe' : '#fee2e2',
                                            color: client.status === 'ACTIVE' ? '#1e40af' : '#991b1b'
                                        }}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => handleDelete(client.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
