import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CAR_MAKES, calculateEMI, formatCurrency } from '@/lib/mock-data';
import { ArrowLeft, Calculator, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { FloatingLabelInput, FloatingLabelTextarea, FloatingLabelSelect } from '@/components/FloatingLabelInput';
import '@/styles/floating-labels.css';

export default function CreateLoan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();


  const { data: banks = [] } = useQuery({
    queryKey: ['banks-list'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ['brokers-list'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/brokers`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-for-dropdown'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
  });

  const [leadSearch, setLeadSearch] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLeads = useMemo(() => {
    if (!leadSearch || !leadSearch.trim()) return [];
    const search = leadSearch.toLowerCase();
    return leads.filter((l: any) => 
      l.customer_id?.toLowerCase().includes(search) ||
      l.customer_name?.toLowerCase().includes(search) ||
      l.phone_no?.includes(search)
    );
  }, [leads, leadSearch]);

  const [showOptionalFields, setShowOptionalFields] = useState({
    coApplicant: false,
    guarantor: false,
    permanentAddress: false,
  });

  const [fetchingVehicleData, setFetchingVehicleData] = useState(false);

  const fetchVehicleDetails = async (rcNumber: string) => {
    if (!rcNumber || rcNumber.length < 8) return;
    
    setFetchingVehicleData(true);
    try {
      console.log('Fetching from API');
      toast.info('Fetching from API...');
      const response = await fetch('https://kyc-api.surepass.app/api/v1/rc/rc-v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NjM5ODg5MiwianRpIjoiMjdiNjdiNWEtZjkyZC00YTZmLTk2NmMtMDhhZjc4ZjAwNmI2IiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LmZpbm9uZXN0aW5kaWFAc3VyZXBhc3MuaW8iLCJuYmYiOjE3NjYzOTg4OTIsImV4cCI6MjM5NzExODg5MiwiZW1haWwiOiJmaW5vbmVzdGluZGlhQHN1cmVwYXNzLmlvIiwidGVuYW50X2lkIjoibWFpbiIsInVzZXJfY2xhaW1zIjp7InNjb3BlcyI6WyJ1c2VyIl19fQ.dl1S5S3OxNs3hwxkwtLhcTAN6CmIlYa_hg4yOl5ASlg'
        },
        body: JSON.stringify({ id_number: rcNumber, enrich: true }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rcData = await response.json();
      console.log('RC API Response:', rcData);
      console.log('RC Data fields:', Object.keys(rcData.data || {}));
      
      if (rcData.success && rcData.data) {
        const rc = rcData.data;
        
        setForm(f => ({
          ...f,
          // Vehicle Details
          makerName: rc.maker_model || rc.vehicle_manufacturer_name || rc.manufacturer || rc.make || '',
          modelVariantName: rc.model || rc.vehicle_model || rc.variant || rc.model_name || rc.vehicle_class || '',
          mfgYear: rc.manufacturing_date?.split('-')[0] || rc.registration_date?.split('-')[0] || rc.mfg_year || rc.year || rc.manufacturing_year || rc.model_year || '',
          
          // RC/RTO Details  
          rcOwnerName: rc.owner_name || '',
          rcMfgDate: rc.manufacturing_date || rc.registration_date || '',
          rcExpiryDate: rc.fitness_upto ? (rc.fitness_upto.includes('/') ? 
            (() => {
              const [month, year] = rc.fitness_upto.split('/');
              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
              return date.toISOString().split('T')[0];
            })() : rc.fitness_upto) : rc.tax_upto ? (rc.tax_upto.includes('/') ? 
            (() => {
              const [month, year] = rc.tax_upto.split('/');
              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
              return date.toISOString().split('T')[0];
            })() : rc.tax_upto) : '',
          hpnAtLogin: rc.financer ? (rc.financer || 'Financed') : 'Not Financed',
          isFinanced: rc.financer ? 'Yes' : 'No',
          fc: rc.fitness_upto ? 'Yes' : 'No',
          
          // Customer Details (only if empty)
          customerName: f.customerName || rc.owner_name || '',
          mobile: f.mobile || rc.mobile_number || '',
          
          // Address from RC (only if empty)
          currentAddress: f.currentAddress || rc.present_address || rc.permanent_address || '',
          permanentAddress: f.permanentAddress || rc.permanent_address || '',
          currentPincode: f.currentPincode || rc.present_address?.match(/\d{6}/)?.[0] || rc.permanent_address?.match(/\d{6}/)?.[0] || '',
          permanentPincode: f.permanentPincode || rc.permanent_address?.match(/\d{6}/)?.[0] || '',
          
          // Insurance Details
          insuranceCompanyName: rc.insurance_company || '',
          insurancePolicyNumber: rc.insurance_policy_number || '',
          insuranceDate: rc.insurance_upto || '',
        }));
        
        toast.success('Vehicle details fetched successfully!');
      } else {
        toast.error('Could not fetch vehicle details');
      }
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      toast.error('Failed to fetch vehicle details');
    } finally {
      setFetchingVehicleData(false);
    }
  };

  const [form, setForm] = useState({
    // Customer Details
    customerId: '', customerName: '', mobile: '', coApplicantName: '', coApplicantMobile: '',
    guarantorName: '', guarantorMobile: '', ourBranch: '',
    currentAddress: '', currentVillage: '', currentTehsil: '', currentDistrict: '', currentState: '', currentPincode: '',
    sameAsCurrentAddress: false,
    permanentAddress: '', permanentVillage: '', permanentTehsil: '', permanentDistrict: '', permanentState: '', permanentPincode: '',
    // Loan & Vehicle Details
    loanNumber: '', purposeLoanAmount: '', loanAmount: '', ltv: '', loanTypeVehicle: '',
    vehicleNumber: '', makerName: '', modelVariantName: '', mfgYear: '', vertical: '', scheme: '',
    // Income Details
    incomeSource: '', monthlyIncome: '',
    // RTO Details
    rcOwnerName: '', rcMfgDate: '', rcExpiryDate: '', hpnAtLogin: '', isFinanced: '', newFinancier: '', rtoDocsHandoverDate: '',
    rtoAgentName: '', agentMobileNo: '', dtoLocation: '', rtoWorkDescription: '', challan: 'No', fc: 'No', rtoPapers: '',
    // RTO Papers Checkboxes
    rtoRC: false, rtoNOC: false, rtoPermit: false, rtoPollution: false, rto2930Form: false,
    rtoSellAgreement: false, rtoRCOwnerKYC: false, rtoStampPapers: false,
    // EMI Details
    irr: '', tenure: '60', emiMode: 'Monthly', emiStartDate: '', emiEndDate: '',
    // Financier Details
    assignedBankId: '', assignedBrokerId: '', financierExecutiveName: '', financierTeamVertical: '', disburseBranchName: '', sanctionAmount: '', sanctionDate: '',
    // Insurance Details
    insuranceCompanyName: '', premiumAmount: '', insuranceDate: '', insurancePolicyNumber: '',
    // Deductions & Disbursement Details
    processingFee: '', totalDeduction: '', netDisbursementAmount: '', paymentReceivedDate: '',
    // Others
    loginDate: '', approvalDate: '', sourcingPersonName: '', remark: '', fileStatus: 'submitted',
    // Documents
    aadharFront: null, aadharBack: null, panCard: null, drivingLicence: null, lightBill: null,
    bankStatement: null, cheque: null, rcFront: null, rcBack: null, incomeProof: null,
    rentAgreement: null, customerPhoto: null, disbursementMemo: null, insurance: null, customerLedger: null,
    coAadharFront: null, coAadharBack: null, coPanCard: null, coPhoto: null,
    guarantorAadharFront: null, guarantorAadharBack: null, guarantorPanCard: null,
    guarantorRcFront: null, guarantorRcBack: null, guarantorPhoto: null,
  });

  const update = (key: string, val: string | File | null) => setForm(f => ({ ...f, [key]: val }));

  const handleLeadSelect = (lead: any) => {
    setForm(f => ({
      ...f,
      customerId: lead.customer_id || '',
      customerName: lead.customer_name || '',
      mobile: lead.phone_no || '',
      currentAddress: lead.address || '',
      currentTehsil: lead.tehsil || '',
      currentDistrict: lead.district || '',
      currentPincode: lead.pin_code || '',
      vehicleNumber: lead.vehicle_no || '',
      loanAmount: lead.loan_amount_required ? String(lead.loan_amount_required) : '',
      irr: lead.irr_requested ? String(lead.irr_requested) : '',
      sourcingPersonName: lead.sourcing_person_name || '',
      ourBranch: lead.our_branch || '',
    }));
    
    // Auto-fetch vehicle details if RC number exists
    if (lead.vehicle_no && lead.vehicle_no.length >= 8) {
      fetchVehicleDetails(lead.vehicle_no);
    }
  };

  const handleSameAddress = (checked: boolean) => {
    setForm(f => ({
      ...f,
      sameAsCurrentAddress: checked,
      ...(checked ? {
        permanentAddress: f.currentAddress,
        permanentVillage: f.currentVillage,
        permanentTehsil: f.currentTehsil,
        permanentDistrict: f.currentDistrict,
        permanentState: f.currentState,
        permanentPincode: f.currentPincode,
      } : {})
    }));
  };

  const emi = useMemo(() => {
    const p = Number(form.loanAmount);
    const r = Number(form.irr);
    const t = Number(form.tenure);
    if (p > 0 && r > 0 && t > 0) return calculateEMI(p, r, t);
    return 0;
  }, [form.loanAmount, form.irr, form.tenure]);

  const totalPayable = emi * Number(form.tenure);
  const totalInterest = totalPayable - Number(form.loanAmount);

  const generateLoanId = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `CL-${year}-${num}`;
  };

  const createLoan = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          customer_id: form.customerId || null,
          applicant_name: form.customerName,
          mobile: form.mobile,
          co_applicant_name: form.coApplicantName || null,
          co_applicant_mobile: form.coApplicantMobile || null,
          guarantor_name: form.guarantorName || null,
          guarantor_mobile: form.guarantorMobile || null,
          current_address: form.currentAddress || null,
          current_village: form.currentVillage || null,
          current_tehsil: form.currentTehsil || null,
          current_district: form.currentDistrict || null,
          current_pincode: form.currentPincode || null,
          permanent_address: form.permanentAddress || null,
          permanent_village: form.permanentVillage || null,
          permanent_tehsil: form.permanentTehsil || null,
          permanent_district: form.permanentDistrict || null,
          permanent_pincode: form.permanentPincode || null,
          our_branch: form.ourBranch || null,
          income_source: form.incomeSource || null,
          monthly_income: Number(form.monthlyIncome) || null,
          loan_amount: Number(form.loanAmount) || 0,
          ltv: Number(form.ltv) || null,
          loan_type_vehicle: form.loanTypeVehicle || null,
          vehicle_number: form.vehicleNumber || null,
          maker_name: form.makerName || null,
          model_variant_name: form.modelVariantName || null,
          mfg_year: form.mfgYear || null,
          vertical: form.vertical || null,
          scheme: form.scheme || null,
          emi_amount: emi || null,
          total_emi: Number(form.tenure) || null,
          total_interest: (totalInterest > 0 ? totalInterest : null),
          irr: Number(form.irr) || null,
          tenure: Number(form.tenure) || 60,
          emi_start_date: form.emiStartDate || null,
          emi_end_date: form.emiEndDate || null,
          processing_fee: Number(form.processingFee) || null,
          emi: emi || null,
          interest_rate: Number(form.irr) || null,
          assigned_bank_id: form.assignedBankId || null,
          assigned_broker_id: form.assignedBrokerId || null,
          sanction_amount: Number(form.sanctionAmount) || null,
          sanction_date: form.sanctionDate || null,
          insurance_company_name: form.insuranceCompanyName || null,
          premium_amount: Number(form.premiumAmount) || null,
          insurance_date: form.insuranceDate || null,
          insurance_policy_number: form.insurancePolicyNumber || null,
          total_deduction: Number(form.totalDeduction) || null,
          net_disbursement_amount: Number(form.netDisbursementAmount) || null,
          payment_received_date: form.paymentReceivedDate || null,
          rc_owner_name: form.rcOwnerName || null,
          rto_agent_name: form.rtoAgentName || null,
          agent_mobile_no: form.agentMobileNo || null,
          login_date: form.loginDate || null,
          approval_date: form.approvalDate || null,
          sourcing_person_name: form.sourcingPersonName || null,
          remark: form.remark || null,
          status: (form.fileStatus === 'draft' ? 'submitted' : form.fileStatus) || 'submitted',
          created_by: user?.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to create loan');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans-dashboard'] });
      toast.success(`Loan created successfully! Loan ID: ${data.loan_number}`);
      navigate(`/loans/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create loan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.mobile.trim() || !form.loanAmount) {
      toast.error('Customer Name, Mobile, and Loan Amount are required');
      return;
    }
    createLoan.mutate();
  };

  // Check if mandatory documents are uploaded (for executive role)
  const isExecutive = user?.role === 'executive';
  const mandatoryDocsUploaded = form.aadharFront && form.aadharBack && form.panCard && form.rcFront && form.rcBack;
  const showOtherDocs = !isExecutive || mandatoryDocsUploaded;

  const inputClass = "w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
  const labelClass = "block text-[10px] font-medium text-foreground/70 mb-1";

  return (
    <div className="w-full mx-auto px-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground mb-2">New Loan Application</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm mb-4 space-y-6">
          {/* Customer Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Customer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative" ref={dropdownRef}>
                  
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      value={leadSearch || form.customerId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setLeadSearch(value);
                        setForm(f => ({ ...f, customerId: value }));
                        setShowLeadDropdown(true);
                      }}
                      onFocus={() => setShowLeadDropdown(true)}
                      placeholder="Search by Customer ID, name or phone..."
                    />
                    {leadSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setLeadSearch('');
                          setForm(f => ({ ...f, customerId: '' }));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {showLeadDropdown && filteredLeads.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredLeads.slice(0, 10).map((l: any) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            handleLeadSelect(l);
                            setLeadSearch(l.customer_id);
                            setShowLeadDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                        >
                          <div className="font-medium text-foreground text-sm">{l.customer_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-mono text-accent">{l.customer_id}</span> • {l.phone_no}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="floating-input-wrapper"><input required className={inputClass} value={form.customerName} onChange={e => update('customerName', e.target.value)} placeholder=" " /><label className={labelClass}>Customer Name *</label></div>
                <div className="floating-input-wrapper"><input required className={inputClass} value={form.mobile} onChange={e => update('mobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Mobile No *</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.ourBranch} onChange={e => update('ourBranch', e.target.value)} placeholder=" " /><label className={labelClass}>Our Branch</label></div>
                
                {/* Co-Applicant Section */}
                <div className="md:col-span-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowOptionalFields(s => ({ ...s, coApplicant: !s.coApplicant }))}
                    className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    {showOptionalFields.coApplicant ? '−' : '+'} Add Co-Applicant Details
                  </button>
                </div>
                {showOptionalFields.coApplicant && (
                  <>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantName} onChange={e => update('coApplicantName', e.target.value)} placeholder=" " /><label className={labelClass}>Co-Applicant Name</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantMobile} onChange={e => update('coApplicantMobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Co-Applicant Mobile</label></div>
                  </>
                )}
                
                {/* Guarantor Section */}
                <div className="md:col-span-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowOptionalFields(s => ({ ...s, guarantor: !s.guarantor }))}
                    className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    {showOptionalFields.guarantor ? '−' : '+'} Add Guarantor Details
                  </button>
                </div>
                {showOptionalFields.guarantor && (
                  <>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorName} onChange={e => update('guarantorName', e.target.value)} placeholder=" " /><label className={labelClass}>Guarantor Name</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorMobile} onChange={e => update('guarantorMobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Guarantor Mobile</label></div>
                  </>
                )}
                
                <div className="md:col-span-3 mt-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Current Address</h3></div>
                <div className="md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={2} value={form.currentAddress} onChange={e => update('currentAddress', e.target.value)} placeholder=" " /><label className={labelClass}>Address</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentVillage} onChange={e => update('currentVillage', e.target.value)} placeholder=" " /><label className={labelClass}>Village</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentTehsil} onChange={e => update('currentTehsil', e.target.value)} placeholder=" " /><label className={labelClass}>Tehsil</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentDistrict} onChange={e => update('currentDistrict', e.target.value)} placeholder=" " /><label className={labelClass}>District</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentState} onChange={e => update('currentState', e.target.value)} placeholder=" " /><label className={labelClass}>State</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentPincode} onChange={e => update('currentPincode', e.target.value)} maxLength={6} placeholder=" " /><label className={labelClass}>Pincode</label></div>
                <div className="md:col-span-3 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.sameAsCurrentAddress} onChange={e => handleSameAddress(e.target.checked)} className="w-4 h-4 rounded border-border" />
                    <span className="text-sm font-medium text-foreground">Same As Current Address</span>
                  </label>
                </div>
                {!form.sameAsCurrentAddress && (
                  <>
                    <div className="md:col-span-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Permanent Address</h3></div>
                    <div className="md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={2} value={form.permanentAddress} onChange={e => update('permanentAddress', e.target.value)} placeholder=" " /><label className={labelClass}>Address</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentVillage} onChange={e => update('permanentVillage', e.target.value)} placeholder=" " /><label className={labelClass}>Village</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentTehsil} onChange={e => update('permanentTehsil', e.target.value)} placeholder=" " /><label className={labelClass}>Tehsil</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentDistrict} onChange={e => update('permanentDistrict', e.target.value)} placeholder=" " /><label className={labelClass}>District</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentState} onChange={e => update('permanentState', e.target.value)} placeholder=" " /><label className={labelClass}>State</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentPincode} onChange={e => update('permanentPincode', e.target.value)} maxLength={6} placeholder=" " /><label className={labelClass}>Pincode</label></div>
                  </>
                )}
              </div>
            </div>

          {/* Vehicle & Loan */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Vehicle & Loan Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative floating-input-wrapper">
                  <input 
                    className={inputClass} 
                    value={form.vehicleNumber} 
                    onChange={e => {
                      const value = e.target.value.toUpperCase();
                      update('vehicleNumber', value);
                      if (value.length >= 8) {
                        fetchVehicleDetails(value);
                      }
                    }}
                    placeholder=" "
                  />
                  <label className={labelClass}>Vehicle Reg. No</label>
                  {fetchingVehicleData && (
                    <div className="absolute right-3 top-8">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.makerName} onChange={e => update('makerName', e.target.value)} placeholder=" " /><label className={labelClass}>Maker's Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.modelVariantName} onChange={e => update('modelVariantName', e.target.value)} placeholder=" " /><label className={labelClass}>Model / Variant</label></div>
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.mfgYear} onChange={e => update('mfgYear', e.target.value)} min="2000" max="2030" placeholder=" " /><label className={labelClass}>Mfg Year</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.vertical} onChange={e => update('vertical', e.target.value)}><option value="">Select</option><option value="LCV">LCV</option><option value="HCV">HCV</option><option value="PV (Car)">PV (Car)</option><option value="CV">CV</option><option value="Tractor">Tractor</option></select><label className={labelClass}>Vertical</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.scheme} onChange={e => update('scheme', e.target.value)}><option value="">Select</option><option value="Re-finance">Re-finance</option><option value="New Finance">New Finance</option><option value="Balance Transfer">Balance Transfer</option><option value="Purchase">Purchase</option><option value="Purchase+BT">Purchase+BT</option><option value="SVSH">SVSH</option><option value="SVOH">SVOH</option></select><label className={labelClass}>Scheme</label></div>
                <div className="md:col-span-3 mt-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Loan Details</h3></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.purposeLoanAmount} onChange={e => update('purposeLoanAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Purpose Loan Amount</label></div>
                <div className="floating-input-wrapper"><input required type="number" className={inputClass} value={form.loanAmount} onChange={e => update('loanAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Loan Amount (₹) *</label></div>
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.ltv} onChange={e => update('ltv', e.target.value)} placeholder=" " /><label className={labelClass}>LTV (%)</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.loanTypeVehicle} onChange={e => update('loanTypeVehicle', e.target.value)}><option value="">Select</option><option value="New Vehicle Loan">New Vehicle Loan</option><option value="Used Vehicle Loan">Used Vehicle Loan</option></select><label className={labelClass}>Loan Type</label></div>
              </div>
            </div>

          {/* EMI & Financier */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">EMI & Financier Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="floating-input-wrapper"><input required type="number" step="0.01" className={inputClass} value={form.irr} onChange={e => update('irr', e.target.value)} placeholder=" " /><label className={labelClass}>IRR (%) *</label></div>
                <div className="floating-input-wrapper"><select required className={inputClass} value={form.tenure} onChange={e => update('tenure', e.target.value)}>{[12, 18, 24, 36, 48, 60, 72, 84].map(t => <option key={t} value={t}>{t} MONTH</option>)}</select><label className={labelClass}>Tenure *</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.emiMode} onChange={e => update('emiMode', e.target.value)}><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Half Yearly">Half Yearly</option><option value="Yearly">Yearly</option></select><label className={labelClass}>EMI Mode</label></div>
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.processingFee} onChange={e => update('processingFee', e.target.value)} placeholder=" " /><label className={labelClass}>Processing Fee (₹)</label></div>
                {(form.irr && form.loanAmount) && (
                  <>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.emiStartDate} onChange={e => update('emiStartDate', e.target.value)} placeholder=" " /><label className={labelClass}>EMI Start Date</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.emiEndDate} onChange={e => update('emiEndDate', e.target.value)} placeholder=" " /><label className={labelClass}>EMI End Date</label></div>
                  </>
                )}
              </div>
              {emi > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
                  <div className="flex items-center gap-2 mb-3"><Calculator size={16} className="text-accent" /><span className="text-accent font-semibold text-sm">EMI Calculator</span></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-background/50"><p className="text-xs text-muted-foreground mb-1">Monthly EMI</p><p className="text-lg font-bold text-accent break-all">{formatCurrency(emi)}</p></div>
                    <div className="text-center p-3 rounded-lg bg-background/50"><p className="text-xs text-muted-foreground mb-1">Total Interest</p><p className="text-lg font-bold text-foreground break-all">{formatCurrency(totalInterest > 0 ? totalInterest : 0)}</p></div>
                    <div className="text-center p-3 rounded-lg bg-background/50"><p className="text-xs text-muted-foreground mb-1">Total Payable</p><p className="text-lg font-bold text-foreground break-all">{formatCurrency(totalPayable)}</p></div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="md:col-span-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Financier Details</h3></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.assignedBankId} onChange={e => update('assignedBankId', e.target.value)}><option value="">Select Financier Name</option>{(banks as any[]).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><label className={labelClass}>Financier Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financierExecutiveName} onChange={e => update('financierExecutiveName', e.target.value)} placeholder=" " /><label className={labelClass}>Financier Executive Name</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.financierTeamVertical} onChange={e => update('financierTeamVertical', e.target.value)}><option value="">Select Team Vertical</option><option value="LCV">LCV</option><option value="HCV">HCV</option><option value="PV">PV</option><option value="CV">CV</option><option value="Tractor">Tractor</option></select><label className={labelClass}>Financier Team Vertical</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.disburseBranchName} onChange={e => update('disburseBranchName', e.target.value)} placeholder=" " /><label className={labelClass}>Disburse Branch Name</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.assignedBrokerId} onChange={e => update('assignedBrokerId', e.target.value)}><option value="">Select Broker (Optional)</option>{(brokers as any[]).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><label className={labelClass}>Broker</label></div>
                {form.assignedBankId && (
                  <>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.sanctionAmount} onChange={e => update('sanctionAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Sanction Amount (₹)</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.sanctionDate} onChange={e => update('sanctionDate', e.target.value)} placeholder=" " /><label className={labelClass}>Sanction Date</label></div>
                  </>
                )}
              </div>
            </div>

          {/* Insurance & RTO */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Insurance & RTO Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="floating-input-wrapper"><input className={inputClass} value={form.insuranceCompanyName} onChange={e => update('insuranceCompanyName', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Company</label></div>
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.premiumAmount} onChange={e => update('premiumAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Premium Amount (₹)</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.insuranceDate} onChange={e => update('insuranceDate', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Expiry Date</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.insurancePolicyNumber} onChange={e => update('insurancePolicyNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Policy Number</label></div>
                <div className="md:col-span-3 mt-3"><h3 className="font-semibold text-foreground mb-2 text-sm">RTO Details</h3></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.rcOwnerName} onChange={e => update('rcOwnerName', e.target.value)} placeholder=" " /><label className={labelClass}>RC Owner Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.hpnAtLogin} onChange={e => update('hpnAtLogin', e.target.value)} placeholder=" " /><label className={labelClass}>HPN / Financed Status</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.rtoAgentName} onChange={e => update('rtoAgentName', e.target.value)} placeholder=" " /><label className={labelClass}>RTO Agent Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.agentMobileNo} onChange={e => update('agentMobileNo', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Agent Mobile</label></div>
              </div>
            </div>

          {/* Deduction & Disbursement */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Deduction & Disbursement</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.totalDeduction} onChange={e => update('totalDeduction', e.target.value)} placeholder=" " /><label className={labelClass}>Total Deduction (₹)</label></div>
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.netDisbursementAmount} onChange={e => update('netDisbursementAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Net Disbursement Amount (₹)</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.paymentReceivedDate} onChange={e => update('paymentReceivedDate', e.target.value)} placeholder=" " /><label className={labelClass}>Payment Received Date</label></div>
                <div className="md:col-span-3 mt-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Other Details</h3></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.loginDate} onChange={e => update('loginDate', e.target.value)} placeholder=" " /><label className={labelClass}>Login Date</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.approvalDate} onChange={e => update('approvalDate', e.target.value)} placeholder=" " /><label className={labelClass}>Approval Date</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.sourcingPersonName} onChange={e => update('sourcingPersonName', e.target.value)} placeholder=" " /><label className={labelClass}>Sourcing Person</label></div>
                <div className="md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={3} value={form.remark} onChange={e => update('remark', e.target.value)} placeholder=" " /><label className={labelClass}>Remark</label></div>
              </div>
            </div>

          {/* Documents */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Documents</h2>
              
              {/* Customer Documents */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Customer Documents {isExecutive && <span className="text-xs text-red-500">(Upload mandatory documents first)</span>}</h3>
                
                {/* Mandatory Documents for Executive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className={labelClass}>Aadhar Card Front {isExecutive && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('aadharFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive} />
                    {form.aadharFront && <p className="text-xs text-green-600 mt-1">✓ {(form.aadharFront as File).name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Aadhar Card Back {isExecutive && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('aadharBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive} />
                    {form.aadharBack && <p className="text-xs text-green-600 mt-1">✓ {(form.aadharBack as File).name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Pan Card {isExecutive && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('panCard', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive} />
                    {form.panCard && <p className="text-xs text-green-600 mt-1">✓ {(form.panCard as File).name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Front) {isExecutive && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('rcFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive} />
                    {form.rcFront && <p className="text-xs text-green-600 mt-1">✓ {(form.rcFront as File).name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Back) {isExecutive && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('rcBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive} />
                    {form.rcBack && <p className="text-xs text-green-600 mt-1">✓ {(form.rcBack as File).name}</p>}
                  </div>
                </div>

                {/* Other Documents - Show only after mandatory docs are uploaded */}
                {showOtherDocs ? (
                  <>
                    {isExecutive && <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-300">✓ Mandatory documents uploaded. You can now upload additional documents.</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><label className={labelClass}>Driving Licence</label><input type="file" className={inputClass} onChange={e => update('drivingLicence', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                      <div><label className={labelClass}>Light Bill</label><input type="file" className={inputClass} onChange={e => update('lightBill', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                      <div><label className={labelClass}>Last 6 Month Bank Statement</label><input type="file" className={inputClass} onChange={e => update('bankStatement', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                      <div><label className={labelClass}>Cheque</label><input type="file" className={inputClass} onChange={e => update('cheque', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                      <div><label className={labelClass}>Income Proof</label><input type="file" className={inputClass} onChange={e => update('incomeProof', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                      <div><label className={labelClass}>Rent Agreement</label><input type="file" className={inputClass} onChange={e => update('rentAgreement', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                      <div><label className={labelClass}>Customer Photo</label><input type="file" className={inputClass} onChange={e => update('customerPhoto', e.target.files?.[0] || null)} accept="image/*" /></div>
                      <div><label className={labelClass}>Disbursement Memo</label><input type="file" className={inputClass} onChange={e => update('disbursementMemo', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                      <div><label className={labelClass}>Insurance</label><input type="file" className={inputClass} onChange={e => update('insurance', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                      <div><label className={labelClass}>Customer Ledger</label><input type="file" className={inputClass} onChange={e => update('customerLedger', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-700 dark:text-yellow-300">
                    ⚠️ Please upload all 5 mandatory documents (Aadhar Front, Aadhar Back, PAN Card, RC Front, RC Back) to unlock additional document uploads.
                  </div>
                )}
              </div>

            </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pb-6">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="px-6 py-3 rounded-xl border-2 border-border font-semibold hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={createLoan.isPending} 
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
          >
            {createLoan.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : '✓ Create Application'}
          </button>
        </div>
          </div>
      </form>
    </div>
  );
}
