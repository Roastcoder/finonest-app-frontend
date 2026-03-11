import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CAR_MAKES, calculateEMI, formatCurrency } from '@/lib/mock-data';
import { FINANCIERS } from '@/lib/financiers';
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
      l.phone?.includes(search)
    );
  }, [leads, leadSearch]);

  const [showOptionalFields, setShowOptionalFields] = useState({
    coApplicant: false,
    guarantor: false,
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
        
        // Helper function to convert date from DD/MM/YYYY to YYYY-MM-DD
        const convertDate = (dateStr: string) => {
          if (!dateStr) return '';
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
            const [day, month, year] = dateStr.split('-');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return dateStr;
        };
        
        setForm(f => ({
          ...f,
          // Vehicle Details - Only these fields
          engineNumber: rc.engine_number || '',
          chassisNumber: rc.chassis_number || '',
          ownerName: rc.owner_name || '',
          makerDescription: rc.maker_description || '',
          makerModel: rc.maker_model || '',
          fuelType: rc.fuel_type || '',
          manufacturingDate: convertDate(rc.manufacturing_date || ''),
          insuranceCompany: rc.insurance_company || '',
          insuranceValidUpto: convertDate(rc.insurance_validity || rc.insurance_upto || ''),
          puccValidUpto: convertDate(rc.pucc_upto || rc.pollution_validity || ''),
          financer: rc.financer || '',
          financeStatus: rc.financed === 'YES' || rc.financer ? 'Financed' : 'Not Financed',
          ownershipType: rc.owner_serial_number === '1' ? 'First Owner' : rc.owner_serial_number === '2' ? 'Second Owner' : rc.owner_serial_number === '3' ? 'Third Owner' : rc.owner_serial_number === '4' ? 'Fourth Owner' : '',
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
    currentAddress: '', currentLandmark: '', currentDistrict: '', currentState: '', currentPincode: '',
    // Loan & Vehicle Details
    loanNumber: '', purposeLoanAmount: '', loanAmount: '', ltv: '', loanTypeVehicle: '',
    vehicleNumber: '', engineNumber: '', chassisNumber: '', ownerName: '', makerName: '', makerDescription: '',
    makerModel: '', modelVariantName: '', fuelType: '', manufacturingDate: '',
    ownershipType: '', financer: '', financeStatus: '', insuranceCompany: '', insuranceValidUpto: '',
    puccValidUpto: '', vertical: '', scheme: '',
    // Income Details
    incomeSource: '', monthlyIncome: '',
    // Financier Selection (for executive/team_leader)
    selectedFinancier: '', otherSelectedFinancier: '', financierLocation: '',
    // RTO Details
    rcOwnerName: '', rcMfgDate: '', rcExpiryDate: '', hpnAtLogin: '', isFinanced: '', newFinancier: '', rtoDocsHandoverDate: '',
    rtoAgentName: '', agentMobileNo: '', dtoLocation: '', rtoWorkDescription: '', challan: 'No', fc: 'No', rtoPapers: '',
    // RTO Papers Checkboxes
    rtoRC: false, rtoNOC: false, rtoPermit: false, rtoPollution: false, rto2930Form: false,
    rtoSellAgreement: false, rtoRCOwnerKYC: false, rtoStampPapers: false,
    // EMI Details
    irr: '', tenure: '60', emiMode: 'Monthly', emiStartDate: '', emiEndDate: '',
    // Financier Details
    assignedBankId: '', assignedBrokerId: '', financierExecutiveName: '', financierTeamVertical: '', disburseBranchName: '', sanctionAmount: '', sanctionDate: '', financierName: '', otherFinancierName: '',
    // Insurance Details
    insuranceCompanyName: '', premiumAmount: '', insuranceDate: '', insurancePolicyNumber: '',
    // Deductions & Disbursement Details
    processingFee: '', totalDeduction: '', netDisbursementAmount: '', paymentReceivedDate: '',
    // Others
    loginDate: new Date().toISOString().split('T')[0], sourcingPersonName: '', remark: '', fileStatus: 'submitted',
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
      mobile: lead.phone || lead.phone_no || '',
      currentAddress: lead.current_address || '',
      currentDistrict: lead.city || lead.district || '',
      currentState: lead.state || '',
      currentPincode: lead.pincode || '',
      vehicleNumber: lead.vehicle_number || lead.vehicle_no || '',
      loanAmount: lead.loan_amount_required ? String(lead.loan_amount_required) : '',
      purposeLoanAmount: lead.loan_amount_required ? String(lead.loan_amount_required) : '',
      loanTypeVehicle: lead.case_type === 'purchase' ? 'New Vehicle Loan' : 'Used Vehicle Loan',
      scheme: lead.case_type === 'purchase' ? 'Purchase' : lead.case_type === 'refinance' ? 'Re-finance' : 'Balance Transfer',
      financierName: lead.financier_name || '',
      sourcingPersonName: lead.created_by_name || lead.sourcing_person_name || '',
    }));
    
    toast.success(`Lead data loaded for ${lead.customer_name}`);
  };

  // Auto-fetch lead data when leadId is in URL
  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId && leads.length > 0) {
      const lead = leads.find((l: any) => l.id === Number(leadId));
      if (lead) {
        handleLeadSelect(lead);
        setLeadSearch(lead.customer_id);
      }
    }
  }, [searchParams, leads]);

  const handleSameAddress = (checked: boolean) => {
    setForm(f => ({
      ...f,
      sameAsCurrentAddress: checked,
      ...(checked ? {
        permanentAddress: f.currentAddress,
        permanentLandmark: f.currentLandmark,
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
      const loanId = form.loanNumber || generateLoanId();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          id: loanId,
          loan_number: loanId,
          customer_id: form.customerId || null,
          applicant_name: form.customerName,
          mobile: form.mobile,
          co_applicant_name: form.coApplicantName || null,
          co_applicant_mobile: form.coApplicantMobile || null,
          guarantor_name: form.guarantorName || null,
          guarantor_mobile: form.guarantorMobile || null,
          current_address: form.currentAddress || null,
          current_landmark: form.currentLandmark || null,
          current_district: form.currentDistrict || null,
          current_state: form.currentState || null,
          current_pincode: form.currentPincode || null,
          our_branch: form.ourBranch || null,
          income_source: form.incomeSource || null,
          monthly_income: Number(form.monthlyIncome) || null,
          selected_financier: form.selectedFinancier === 'Others' ? form.otherSelectedFinancier : form.selectedFinancier,
          financier_location: form.financierLocation || null,
          loan_amount: Number(form.loanAmount) || 0,
          ltv: Number(form.ltv) || null,
          loan_type_vehicle: form.loanTypeVehicle || null,
          vehicle_number: form.vehicleNumber || null,
          engine_number: form.engineNumber || null,
          chassis_number: form.chassisNumber || null,
          owner_name: form.ownerName || null,
          maker_name: form.makerName || null,
          maker_description: form.makerDescription || null,
          maker_model: form.makerModel || null,
          model_variant_name: form.modelVariantName || null,
          fuel_type: form.fuelType || null,
          manufacturing_date: form.manufacturingDate || null,
          ownership_type: form.ownershipType || null,
          financer: form.financer || null,
          finance_status: form.financeStatus || null,
          insurance_company: form.insuranceCompany || null,
          insurance_valid_upto: form.insuranceValidUpto || null,
          pucc_valid_upto: form.puccValidUpto || null,
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
          financier_name: form.financierName === 'Others' ? form.otherFinancierName : form.financierName,
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
      toast.success('Loan application created successfully!');
      navigate('/loans');
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

  // Check if mandatory documents are uploaded (for executive and team_leader roles)
  const isExecutive = user?.role === 'executive';
  const isTeamLeader = user?.role === 'team_leader';
  const mandatoryDocsUploaded = form.aadharFront && form.aadharBack && form.panCard && form.rcFront && form.rcBack;
  const showOtherDocs = (!isExecutive && !isTeamLeader) || mandatoryDocsUploaded;

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
                            <span className="font-mono text-accent">{l.customer_id}</span> • {l.phone}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="floating-input-wrapper"><input required className={inputClass} value={form.customerName} onChange={e => update('customerName', e.target.value)} placeholder=" " /><label className={labelClass}>Customer Name *</label></div>
                <div className="floating-input-wrapper"><input required className={inputClass} value={form.mobile} onChange={e => update('mobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Mobile No *</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.sourcingPersonName} onChange={e => update('sourcingPersonName', e.target.value)} placeholder=" " /><label className={labelClass}>Sourcing Person</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.loginDate} onChange={e => update('loginDate', e.target.value)} placeholder=" " /><label className={labelClass}>Login Date</label></div>
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
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentLandmark} onChange={e => update('currentLandmark', e.target.value)} placeholder=" " /><label className={labelClass}>Landmark</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentDistrict} onChange={e => update('currentDistrict', e.target.value)} placeholder=" " /><label className={labelClass}>District</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentState} onChange={e => update('currentState', e.target.value)} placeholder=" " /><label className={labelClass}>State</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentPincode} onChange={e => update('currentPincode', e.target.value)} maxLength={6} placeholder=" " /><label className={labelClass}>Pincode</label></div>
              </div>
            </div>

          {/* Vehicle & Loan */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Vehicle & Loan Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1 floating-input-wrapper">
                      <input 
                        className={inputClass} 
                        value={form.vehicleNumber} 
                        onChange={e => {
                          const value = e.target.value.toUpperCase();
                          update('vehicleNumber', value);
                        }}
                        placeholder=" "
                      />
                      <label className={labelClass}>Vehicle Reg. No</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchVehicleDetails(form.vehicleNumber)}
                      disabled={!form.vehicleNumber || form.vehicleNumber.length < 8 || fetchingVehicleData}
                      className="px-4 py-2 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      {fetchingVehicleData ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Fetch Details'
                      )}
                    </button>
                  </div>
                </div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.makerName} onChange={e => update('makerName', e.target.value)} placeholder=" " /><label className={labelClass}>Vehicle Company Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.makerModel} onChange={e => update('makerModel', e.target.value)} placeholder=" " /><label className={labelClass}>Vehicle Model</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.makerDescription} onChange={e => update('makerDescription', e.target.value)} placeholder=" " /><label className={labelClass}>Maker Description</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.engineNumber} onChange={e => update('engineNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Engine Number</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.chassisNumber} onChange={e => update('chassisNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Chassis Number</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder=" " /><label className={labelClass}>Owner Name</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.fuelType} onChange={e => update('fuelType', e.target.value)}><option value="">Select</option><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option><option value="CNG">CNG</option><option value="Electric">Electric</option><option value="Hybrid">Hybrid</option></select><label className={labelClass}>Fuel Type</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.manufacturingDate} onChange={e => update('manufacturingDate', e.target.value)} placeholder=" " /><label className={labelClass}>Manufacturing Date</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.ownershipType} onChange={e => update('ownershipType', e.target.value)}><option value="">Select</option><option value="First Owner">First Owner</option><option value="Second Owner">Second Owner</option><option value="Third Owner">Third Owner</option><option value="Fourth Owner">Fourth Owner</option></select><label className={labelClass}>Ownership Type</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financer} onChange={e => update('financer', e.target.value)} placeholder=" " /><label className={labelClass}>Financer</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.financeStatus} onChange={e => update('financeStatus', e.target.value)}><option value="">Select</option><option value="Financed">Financed</option><option value="Not Financed">Not Financed</option></select><label className={labelClass}>Finance Status</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.insuranceCompany} onChange={e => update('insuranceCompany', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Company</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.insuranceValidUpto} onChange={e => update('insuranceValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Valid Upto</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.puccValidUpto} onChange={e => update('puccValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>PUCC Valid Upto</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.vertical} onChange={e => update('vertical', e.target.value)}><option value="">Select</option><option value="LCV">LCV</option><option value="HCV">HCV</option><option value="PV (Car)">PV (Car)</option><option value="CV">CV</option><option value="Tractor">Tractor</option></select><label className={labelClass}>Vertical</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.scheme} onChange={e => update('scheme', e.target.value)}><option value="">Select</option><option value="Re-finance">Re-finance</option><option value="New Finance">New Finance</option><option value="Balance Transfer">Balance Transfer</option><option value="Purchase">Purchase</option><option value="Purchase+BT">Purchase+BT</option><option value="SVSH">SVSH</option><option value="SVOH">SVOH</option></select><label className={labelClass}>Scheme</label></div>
                <div className="md:col-span-3 mt-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Loan Details</h3></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.purposeLoanAmount} onChange={e => update('purposeLoanAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Purpose Loan Amount</label></div>
                <div className="floating-input-wrapper"><input required type="number" className={inputClass} value={form.loanAmount} onChange={e => update('loanAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Loan Amount (₹) *</label></div>
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.ltv} onChange={e => update('ltv', e.target.value)} placeholder=" " /><label className={labelClass}>LTV (%)</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.loanTypeVehicle} onChange={e => update('loanTypeVehicle', e.target.value)}><option value="">Select</option><option value="New Vehicle Loan">New Vehicle Loan</option><option value="Used Vehicle Loan">Used Vehicle Loan</option></select><label className={labelClass}>Loan Type</label></div>
              </div>
            </div>

          {/* Income & Financier Selection (for Executive/Team Leader) */}
          {(isExecutive || isTeamLeader) && (
            <div>
              <h2 className="text-base font-bold text-foreground mb-3">Income & Financier Selection</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="floating-input-wrapper"><select className={inputClass} value={form.incomeSource} onChange={e => update('incomeSource', e.target.value)}><option value="">Select Income Source</option><option value="Salaried">Salaried</option><option value="Self Employed">Self Employed</option><option value="Business">Business</option></select><label className={labelClass}>Income Source</label></div>
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.monthlyIncome} onChange={e => update('monthlyIncome', e.target.value)} placeholder=" " /><label className={labelClass}>Monthly Income (₹)</label></div>
                <div className="md:col-span-3 mt-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Financier Selection</h3></div>
                <div className="floating-input-wrapper">
                  <select className={inputClass} value={form.selectedFinancier} onChange={e => update('selectedFinancier', e.target.value)}>
                    <option value="">Select Financier</option>
                    {FINANCIERS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <label className={labelClass}>Financier Name</label>
                </div>
                {form.selectedFinancier === 'Others' && (
                  <div className="floating-input-wrapper">
                    <input className={inputClass} value={form.otherSelectedFinancier} onChange={e => update('otherSelectedFinancier', e.target.value)} placeholder=" " />
                    <label className={labelClass}>Enter Financier Name</label>
                  </div>
                )}
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financierLocation} onChange={e => update('financierLocation', e.target.value)} placeholder=" " /><label className={labelClass}>Location</label></div>
              </div>
            </div>
          )}



          {/* Documents */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Documents</h2>
              
              {/* Customer Documents */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Customer Documents {(isExecutive || isTeamLeader) && <span className="text-xs text-red-500">(Upload mandatory documents first)</span>}</h3>
                
                {/* Mandatory Documents for Executive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className={labelClass}>Aadhar Card Front {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('aadharFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    {form.aadharFront && <p className="text-xs text-green-600 mt-1">✓ {(form.aadharFront as File).name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Aadhar Card Back {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('aadharBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    {form.aadharBack && <p className="text-xs text-green-600 mt-1">✓ {(form.aadharBack as File).name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Pan Card {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('panCard', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    {form.panCard && <p className="text-xs text-green-600 mt-1">✓ {(form.panCard as File).name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Front) {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('rcFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    {form.rcFront && <p className="text-xs text-green-600 mt-1">✓ {(form.rcFront as File).name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Back) {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    <input type="file" className={inputClass} onChange={e => update('rcBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />
                    {form.rcBack && <p className="text-xs text-green-600 mt-1">✓ {(form.rcBack as File).name}</p>}
                  </div>
                </div>

                {/* Other Documents - Show only after mandatory docs are uploaded */}
                {showOtherDocs ? (
                  <>
                    {(isExecutive || isTeamLeader) && <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-300">✓ Mandatory documents uploaded. You can now upload additional documents.</div>}
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
