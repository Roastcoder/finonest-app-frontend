import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import LeadDocumentUpload from '@/components/LeadDocumentUpload';
import '@/styles/floating-labels.css';

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8 last:mb-0">
    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
      <span className="w-1.5 h-6 bg-accent rounded-full"></span>
      {title}
    </h3>
    <div className="grid grid-cols-2 gap-3">
      {children}
    </div>
  </div>
);

// Validation functions
const validatePAN = (pan: string): boolean => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

const validateVehicleNumber = (vehicleNumber: string): boolean => {
  const vehicleRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
  return vehicleRegex.test(vehicleNumber);
};

export default function AddLead() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    current_address: '',
    current_landmark: '',
    pincode: '',
    city: '',
    state: '',
    pan_number: '',
    vehicle_number: '',
    loan_amount_required: '',
    case_type: 'new_car_purchase',
    lead_type: 'direct_login',
    financier_id: ''
  });
  const [documents, setDocuments] = useState<{ [key: string]: File }>({});
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeManual, setPincodeManual] = useState(false);
  const [panError, setPanError] = useState('');
  const [vehicleError, setVehicleError] = useState('');

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
      console.log('Sending lead data:', data);
      
      // Try multiple times if backend has collision
      const maxAttempts = 3;
      let lastError = null;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(data)
          });
          
          if (response.ok) {
            console.log(`✅ Success on attempt ${attempt + 1}`);
            return response.json();
          }
          
          const errorText = await response.text();
          console.error(`❌ Attempt ${attempt + 1} failed:`, response.status, errorText);
          
          // If it's not a duplicate error, throw immediately
          if (!errorText.includes('duplicate key value violates unique constraint')) {
            throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to create lead'}`);
          }
          
          lastError = new Error(`HTTP ${response.status}: ${errorText}`);
          
          // Wait before retry
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          }
          
        } catch (error: any) {
          lastError = error;
          if (attempt === maxAttempts - 1) {
            throw error;
          }
        }
      }
      
      throw lastError || new Error('Failed to create lead after multiple attempts');
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
              console.log(`✅ Successfully uploaded ${docType}`);
              uploadSuccess++;
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.error(`❌ Document upload failed for ${docType}:`, errorData);
              uploadFailed++;
            }
          } catch (error) {
            console.error(`❌ Document upload error for ${docType}:`, error);
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
      
      // Handle specific database errors
      if (err.message.includes('duplicate key value violates unique constraint')) {
        if (err.message.includes('customer_id_key')) {
          toast.error('Customer ID conflict occurred. Please try again.');
        } else if (err.message.includes('phone')) {
          toast.error('A lead with this phone number already exists.');
        } else if (err.message.includes('pan_number')) {
          toast.error('A lead with this PAN number already exists.');
        } else if (err.message.includes('vehicle_number')) {
          toast.error('A lead with this vehicle number already exists.');
        } else {
          toast.error('This record already exists in the system.');
        }
      } else {
        toast.error(err.message || 'Failed to create lead');
      }
    },
  });

  const handlePANChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setForm({ ...form, pan_number: upperValue });
    
    if (upperValue.length === 10) {
      if (!validatePAN(upperValue)) {
        setPanError('Invalid PAN format. Format: AAAAA9999A (5 letters, 4 numbers, 1 letter)');
      } else {
        setPanError('');
      }
    } else if (upperValue.length > 0) {
      setPanError('');
    }
  };

  const handleVehicleNumberChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setForm({ ...form, vehicle_number: upperValue });
    
    if (upperValue.length === 10) {
      if (!validateVehicleNumber(upperValue)) {
        setVehicleError('Invalid vehicle number format. Format: AA99AA9999 (2 letters, 2 numbers, 2 letters, 4 numbers)');
      } else {
        setVehicleError('');
      }
    } else if (upperValue.length > 0) {
      setVehicleError('');
    }
  };

  const isDirectLogin = form.lead_type === 'direct_login';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!form.phone.trim() || form.phone.length !== 10) {
      toast.error('Valid 10-digit mobile number is required');
      return;
    }
    
    // PAN is mandatory only for Direct Login
    if (isDirectLogin) {
      if (!form.pan_number.trim() || form.pan_number.length !== 10) {
        toast.error('Valid PAN number is required for Direct Login');
        return;
      }
      if (!validatePAN(form.pan_number)) {
        toast.error('Invalid PAN format. Format: AAAAA9999A (5 letters, 4 numbers, 1 letter)');
        return;
      }
    }
    
    if (!form.current_address.trim()) {
      toast.error('Current address is required');
      return;
    }
    if (!form.pincode.trim() || form.pincode.length !== 6) {
      toast.error('Valid 6-digit pincode is required');
      return;
    }
    if (!form.city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!form.state.trim()) {
      toast.error('State is required');
      return;
    }
    if (!form.vehicle_number.trim() || form.vehicle_number.length !== 10) {
      toast.error('Valid vehicle number is required');
      return;
    }
    if (!validateVehicleNumber(form.vehicle_number)) {
      toast.error('Invalid vehicle number format. Format: AA99AA9999 (2 letters, 2 numbers, 2 letters, 4 numbers)');
      return;
    }
    if (!form.loan_amount_required || Number(form.loan_amount_required) <= 0) {
      toast.error('Valid loan amount is required');
      return;
    }
    if (user?.role !== 'executive' && !form.financier_id) {
      toast.error('Please select a financier');
      return;
    }
    
    // Documents are mandatory only for Direct Login
    if (isDirectLogin) {
      if (Object.keys(documents).length === 0) {
        toast.error('Documents are mandatory for Direct Login. Please upload at least 3 documents.');
        return;
      }
      
      if (Object.keys(documents).length < 3) {
        toast.error(`Please upload 3 documents for Direct Login. Currently uploaded: ${Object.keys(documents).length}`);
        return;
      }
    }
    
    const submissionData = {
      ...form,
      loan_amount_required: Number(form.loan_amount_required),
      financier_id: user?.role === 'executive' ? null : (form.financier_id || null)
    };
    
    console.log('Submitting lead with data:', submissionData);
    createLead.mutate(submissionData);
  };

  const inputClass = "w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
  const labelClass = "block text-[10px] font-medium text-foreground/70 mb-1";

  return (
    <div className="w-full pb-20">
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

      <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-4 shadow-sm relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl -z-10"></div>

        <FormSection title="Personal Information">
          <div className="floating-input-wrapper">
            <input required className={inputClass} value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder=" " />
            <label className={labelClass}>Customer Name *</label>
          </div>
          <div className="floating-input-wrapper">
            <input required type="tel" maxLength={10} className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder=" " />
            <label className={labelClass}>Mobile Number *</label>
          </div>
          <div className="floating-input-wrapper">
            <input type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder=" " />
            <label className={labelClass}>Email Address</label>
          </div>
          <div className="floating-input-wrapper">
            <input className={`${inputClass} ${panError ? 'border-red-500' : ''}`} maxLength={10} value={form.pan_number} onChange={e => handlePANChange(e.target.value)} placeholder=" " required={isDirectLogin} />
            <label className={labelClass}>PAN Number {isDirectLogin ? '*' : '(Optional for Branch Visit)'}</label>
            {panError && <p className="text-[10px] text-red-500 mt-1 font-semibold">{panError}</p>}
          </div>
        </FormSection>

        <FormSection title="Address Details">
          <div className="col-span-2 floating-input-wrapper">
            <textarea required className={inputClass} rows={2} value={form.current_address} onChange={e => setForm({ ...form, current_address: e.target.value })} placeholder=" " />
            <label className={labelClass}>Current Address *</label>
          </div>
          <div className="floating-input-wrapper">
            <input className={inputClass} value={form.current_landmark} onChange={e => setForm({ ...form, current_landmark: e.target.value })} placeholder=" " />
            <label className={labelClass}>Landmark</label>
          </div>
          <div className="floating-input-wrapper">
            <input required className={inputClass} maxLength={6} value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder=" " />
            <label className={labelClass}>Pincode *</label>
          </div>
          <div className="floating-input-wrapper">
            <input required className={inputClass} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} disabled={pincodeLoading || (!pincodeManual && form.pincode.length !== 6)} placeholder=" " />
            <label className={labelClass}>City *</label>
          </div>
          <div className="floating-input-wrapper">
            <input required className={inputClass} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} disabled={pincodeLoading || (!pincodeManual && form.pincode.length !== 6)} placeholder=" " />
            <label className={labelClass}>State *</label>
          </div>
        </FormSection>

        <FormSection title="Vehicle & Loan Details">
          <div className="floating-input-wrapper">
            <input required className={`${inputClass} ${vehicleError ? 'border-red-500' : ''}`} maxLength={10} value={form.vehicle_number} onChange={e => handleVehicleNumberChange(e.target.value)} placeholder=" " />
            <label className={labelClass}>Vehicle Number *</label>
            {vehicleError && <p className="text-[10px] text-red-500 mt-1 font-semibold">{vehicleError}</p>}
          </div>
          <div className="floating-input-wrapper">
            <input required type="number" className={inputClass} value={form.loan_amount_required} onChange={e => setForm({ ...form, loan_amount_required: e.target.value })} placeholder=" " />
            <label className={labelClass}>Loan Amount *</label>
          </div>
          <div className="floating-input-wrapper">
            <select required className={inputClass} value={form.case_type} onChange={e => setForm({ ...form, case_type: e.target.value })}>
              <option value="new_car_purchase">New Car - Purchase</option>
              <option value="used_car_purchase">Used Car - Purchase</option>
              <option value="used_car_refinance">Used Car - Refinance</option>
              <option value="used_car_topup">Used Car - Top-up</option>
              <option value="used_car_bt">Used Car - BT</option>
            </select>
            <label className={labelClass}>Case Type *</label>
          </div>
          <div className="floating-input-wrapper">
            <select required className={inputClass} value={form.lead_type} onChange={e => setForm({ ...form, lead_type: e.target.value })}>
              <option value="direct_login">Direct Login</option>
              <option value="branch_visit">Branch Visit</option>
            </select>
            <label className={labelClass}>Lead Source *</label>
          </div>
          {user?.role !== 'executive' && (
            <div className="col-span-2 floating-input-wrapper">
              <select required className={inputClass} value={form.financier_id} onChange={e => setForm({ ...form, financier_id: e.target.value })}>
                <option value="">Select Financier</option>
                {banks.map((bank: any) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>
              <label className={labelClass}>Preferred Financier *</label>
              {banks.length === 0 && <p className="text-[10px] text-red-500 mt-1 font-bold">Error: No financiers available</p>}
            </div>
          )}
        </FormSection>

        <div className="mt-10 pt-8 border-t border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              {isDirectLogin ? 'Required Documents (3) *' : 'Documents (Optional)'}
            </h3>
          </div>
          <div className="bg-muted/30 p-6 rounded-2xl border border-border/50">
            <LeadDocumentUpload onDocumentsChange={setDocuments} />
            {isDirectLogin ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-3 font-semibold">
                ⚠️ All 3 documents are mandatory for Direct Login. Currently uploaded: {Object.keys(documents).length}/3
              </p>
            ) : (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-3 font-semibold">
                ℹ️ Documents are optional for Branch Visit leads. Currently uploaded: {Object.keys(documents).length}
              </p>
            )}
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
