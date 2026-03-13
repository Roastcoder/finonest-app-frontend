import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import LeadDocumentUpload from '@/components/LeadDocumentUpload';

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8 last:mb-0">
    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
      <span className="w-1.5 h-6 bg-accent rounded-full"></span>
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {children}
    </div>
  </div>
);

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
    financier_id: ''
  });
  const [documents, setDocuments] = useState<{ [key: string]: File }>({});
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
    onSuccess: async (data) => {
      console.log('Lead created response:', data);
      const leadId = data?.id || data?.leadId || data?.lead_id;
      
      if (!leadId) {
        toast.success('Lead created successfully!');
        navigate('/leads-list');
        return;
      }
      
      // Upload documents if any
      if (Object.keys(documents).length > 0) {
        let uploadSuccess = 0;
        let uploadFailed = 0;
        
        for (const [docType, file] of Object.entries(documents)) {
          const formData = new FormData();
          formData.append('document', file);
          formData.append('lead_id', String(leadId));
          formData.append('document_type', docType);

          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: formData
            });

            if (response.ok) {
              uploadSuccess++;
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.error('Document upload failed:', docType, errorData);
              uploadFailed++;
            }
          } catch (error) {
            console.error('Document upload error:', docType, error);
            uploadFailed++;
          }
        }
        
        if (uploadSuccess > 0 && uploadFailed === 0) {
          toast.success(`Lead created! All ${uploadSuccess} document(s) uploaded successfully.`);
        } else if (uploadSuccess > 0 && uploadFailed > 0) {
          toast.warning(`Lead created! ${uploadSuccess} document(s) uploaded, ${uploadFailed} failed.`);
        } else if (uploadFailed > 0) {
          toast.error(`Lead created but all ${uploadFailed} document(s) failed to upload.`);
        }
      } else {
        toast.success('Lead created successfully!');
      }
      
      navigate('/leads-list');
    },
    onError: (err: any) => {
      console.error('Create lead error:', err);
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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200";
  const labelClass = "block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary mb-6 transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/50"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-primary/5 rounded-xl text-primary border border-primary/10">
            <UserPlus size={28} />
          </div>
          Create New Lead
        </h1>
        <p className="text-sm text-muted-foreground mt-2 ml-1">Onboard a new customer and start their loan application process</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-8 border-none shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl -z-10"></div>

        <FormSection title="Personal Information">
          <div>
            <label className={labelClass}>Customer Name *</label>
            <input required className={inputClass} value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Full legal name" />
          </div>

          <div>
            <label className={labelClass}>Mobile Number *</label>
            <input required type="tel" maxLength={10} className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" />
          </div>

          <div>
            <label className={labelClass}>Email Address</label>
            <input type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
          </div>

          <div>
            <label className={labelClass}>PAN Number *</label>
            <input required className={inputClass} maxLength={10} value={form.pan_number} onChange={e => setForm({ ...form, pan_number: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
          </div>
        </FormSection>

        <FormSection title="Address Details">
          <div className="md:col-span-2">
            <label className={labelClass}>Current Address *</label>
            <textarea required className={inputClass} rows={2} value={form.current_address} onChange={e => setForm({ ...form, current_address: e.target.value })} placeholder="Complete street address, house no, etc." />
          </div>

          <div>
            <label className={labelClass}>Pincode *</label>
            <input required className={inputClass} maxLength={6} value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="6-digit pincode" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City *</label>
              <input required className={inputClass} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} disabled={pincodeLoading || (!pincodeManual && form.pincode.length !== 6)} placeholder={pincodeLoading ? '...' : 'City'} />
            </div>
            <div>
              <label className={labelClass}>State *</label>
              <input required className={inputClass} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} disabled={pincodeLoading || (!pincodeManual && form.pincode.length !== 6)} placeholder={pincodeLoading ? '...' : 'State'} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Vehicle & Loan Details">
          <div>
            <label className={labelClass}>Vehicle Number *</label>
            <input required className={inputClass} value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })} placeholder="MH01AB1234" />
          </div>

          <div>
            <label className={labelClass}>Loan Amount *</label>
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
            <label className={labelClass}>Lead Source *</label>
            <select required className={inputClass} value={form.lead_type} onChange={e => setForm({ ...form, lead_type: e.target.value })}>
              <option value="branch_visit">Branch Visit</option>
              <option value="direct_login">Direct Login</option>
            </select>
          </div>

          {user?.role !== 'executive' && (
            <div className="md:col-span-2">
              <label className={labelClass}>Preferred Financier *</label>
              <select required className={inputClass} value={form.financier_id} onChange={e => setForm({ ...form, financier_id: e.target.value })}>
                <option value="">Select Financier</option>
                {banks.map((bank: any) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>
              {banks.length === 0 && <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-bold">Error: No financiers available</p>}
            </div>
          )}
        </FormSection>

        <div className="mt-10 pt-8 border-t border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Required Documents</h3>
          </div>
          <div className="bg-muted/30 p-6 rounded-2xl border border-border/50">
            <LeadDocumentUpload onDocumentsChange={setDocuments} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-12 pt-8 border-t border-border/50">
          <button 
            type="submit" 
            disabled={createLead.isPending} 
            className="flex-1 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-60 shadow-xl"
          >
            {createLead.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Lead...
              </span>
            ) : 'Create Lead Application'}
          </button>
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="px-8 py-4 rounded-2xl border-2 border-border font-bold text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-300"
          >
            Discard
          </button>
        </div>
      </form>
    </div>
  );
}
