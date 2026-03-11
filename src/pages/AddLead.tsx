import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function AddLead() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    current_address: '',
    pincode: '',
    city: '',
    state: '',
    pan_number: '',
    vehicle_number: '',
    loan_amount_required: '',
    case_type: 'new_car_purchase',
    lead_type: 'branch_visit',
    financier_id: '',
    source: '',
    notes: ''
  });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeManual, setPincodeManual] = useState(false);

  const { data: banks = [] } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        console.error('Banks API error:', response.status, response.statusText);
        return [];
      }
      const data = await response.json();
      console.log('Banks loaded:', data.length);
      return data;
    },
  });

  useEffect(() => {
    if (form.pincode.length === 6) {
      setPincodeLoading(true);
      setPincodeManual(false);
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/integrations/pincode/${form.pincode}`)
        .then(res => res.json())
        .then(data => {
          if (data.city && data.state) {
            setForm(prev => ({
              ...prev,
              city: data.city,
              state: data.state
            }));
          } else {
            setPincodeManual(true);
          }
        })
        .catch(() => {
          setPincodeManual(true);
        })
        .finally(() => setPincodeLoading(false));
    } else {
      setForm(prev => ({ ...prev, city: '', state: '' }));
      setPincodeManual(false);
    }
  }, [form.pincode]);

  const createLead = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create lead');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Lead created successfully!');
      navigate('/leads-list');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create lead');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = { ...form };
    if (user?.role === 'executive') {
      submissionData.financier_id = null; // Executives don't set this
    }
    createLead.mutate(submissionData);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent transition-colors";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UserPlus size={24} /> Add Lead
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Capture customer details for loan application</p>
      </div>

      <form onSubmit={handleSubmit} className="stat-card max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Customer Name *</label>
            <input required className={inputClass} value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Full legal name" />
          </div>

          <div>
            <label className={labelClass}>Mobile Number *</label>
            <input required type="tel" maxLength={10} className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Current Address *</label>
            <textarea required className={inputClass} rows={2} value={form.current_address} onChange={e => setForm({ ...form, current_address: e.target.value })} placeholder="Complete address" />
          </div>

          <div>
            <label className={labelClass}>Pincode *</label>
            <input required className={inputClass} maxLength={6} value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="6-digit pincode" />
          </div>

          <div>
            <label className={labelClass}>City *</label>
            <input required className={inputClass} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} disabled={pincodeLoading || (!pincodeManual && form.pincode.length !== 6)} placeholder={pincodeLoading ? 'Fetching...' : pincodeManual ? 'Enter manually' : 'Enter pincode first'} />
          </div>

          <div>
            <label className={labelClass}>State *</label>
            <input required className={inputClass} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} disabled={pincodeLoading || (!pincodeManual && form.pincode.length !== 6)} placeholder={pincodeLoading ? 'Fetching...' : pincodeManual ? 'Enter manually' : 'Enter pincode first'} />
          </div>

          <div>
            <label className={labelClass}>PAN Number *</label>
            <input required className={inputClass} maxLength={10} value={form.pan_number} onChange={e => setForm({ ...form, pan_number: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
          </div>

          <div>
            <label className={labelClass}>Vehicle Number *</label>
            <input required className={inputClass} value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })} placeholder="MH01AB1234" />
          </div>

          <div>
            <label className={labelClass}>Loan Amount Required *</label>
            <input required type="number" className={inputClass} value={form.loan_amount_required} onChange={e => setForm({ ...form, loan_amount_required: e.target.value })} placeholder="Amount in ₹" />
          </div>

          <div>
            <label className={labelClass}>Case Type *</label>
            <select required className={inputClass} value={form.case_type} onChange={e => setForm({ ...form, case_type: e.target.value })}>
              <option value="new_car_purchase">New Car - Purchase</option>
              <option value="used_car_purchase">Used Car - Purchase</option>
              <option value="used_car_refinance">Used Car - Refinance</option>
              <option value="used_car_topup">Used Car - Top-up</option>
              <option value="used_car_bt">Used Car - BT</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Lead Type *</label>
            <select required className={inputClass} value={form.lead_type} onChange={e => setForm({ ...form, lead_type: e.target.value })}>
              <option value="branch_visit">Branch Visit</option>
              <option value="direct_login">Direct Login</option>
            </select>
          </div>

          {user?.role !== 'executive' && (
            <div>
              <label className={labelClass}>Financier Name *</label>
              <select required className={inputClass} value={form.financier_id} onChange={e => setForm({ ...form, financier_id: e.target.value })}>
                <option value="">Select Financier</option>
                {banks.map((bank: any) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>
              {banks.length === 0 && <p className="text-xs text-red-500 mt-1">No financiers loaded</p>}
            </div>
          )}

          <div>
            <label className={labelClass}>Source</label>
            <input className={inputClass} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Lead source" />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={createLead.isPending} className="px-6 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
            {createLead.isPending ? 'Creating...' : 'Create Lead'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
