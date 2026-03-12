import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CAR_MAKES, calculateEMI, formatCurrency } from '@/lib/mock-data';
import { FINANCIERS } from '@/lib/financiers';
import { ArrowLeft, Calculator, Search, X, MessageCircle } from 'lucide-react';
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

  const LEDGER_OPTIONS = [
    'APM Finvest',
    'AU Small Finance Bank',
    'Axis Bank',
    'Bajaj Finance',
    'Bajaj Finserv Ltd',
    'Bandhan Bank',
    'Bank of Baroda',
    'Bank of India',
    'Bank of Maharashtra',
    'CARS 24',
    'Canara Bank',
    'Capital First',
    'Central Bank of India',
    'Cholamandalam Finance',
    'Cholamandalam Investment & Finance',
    'City Union Bank',
    'Dhanlaxmi Bank',
    'ESAF Small Finance Bank',
    'Equitas Small Finance Bank',
    'Federal Bank',
    'Ford Credit India',
    'Fortune Finance',
    'Fullerton India',
    'HDB Financial Services',
    'HDFC Bank',
    'Hero FinCorp',
    'Hinduja Leyland Finance',
    'ICICI Bank',
    'IDBI Bank',
    'IDFC First Bank',
    'IIFL Finance',
    'IKF Finance',
    'Indian Bank',
    'Indostar',
    'Indostar Capital Finance',
    'IndusInd Bank',
    'Jammu & Kashmir Bank',
    'Karnataka Bank',
    'Karur Vysya Bank',
    'Kogta Financial India Limited',
    'Kotak Mahindra Bank',
    'Kotak Mahindra Prime',
    'L&T Finance',
    'Lakshmi Vilas Bank',
    'Magma Fincorp',
    'Mahindra Finance',
    'Manappuram Finance',
    'Maruti Suzuki Finance',
    'Muthoot Capital Services',
    'Muthoot Finance',
    'Oriental Bank of Commerce',
    'Piramal',
    'Poonawalla Fincorp Limited',
    'Punjab National Bank',
    'RBL Bank',
    'Reliance Commercial Finance',
    'Renault Finance',
    'Shriram Finance Limited',
    'Shriram Transport Finance',
    'Sk Finance',
    'Skoda Finance',
    'South Indian Bank',
    'State Bank of Bikaner & Jaipur',
    'State Bank of Hyderabad',
    'State Bank of India',
    'State Bank of Mysore',
    'State Bank of Patiala',
    'State Bank of Travancore',
    'Sundaram Finance',
    'Syndicate Bank',
    'TVS Credit Services',
    'Tamilnad Mercantile Bank',
    'Tata Capital',
    'Toyota Financial Services',
    'Toyota Financial Services India Limited',
    'UCO Bank',
    'Union Bank of India',
    'United Bank of India',
    'Vastu Finserve',
    'Vijaya Bank',
    'Volkswagen Finance',
    'Yes Bank',
    'dugar finance',
    'Others'
  ];

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

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    ledgerSelection: '',
    salesManager: user?.name || '',
    remarks: ''
  });

  const [fetchingVehicleData, setFetchingVehicleData] = useState(false);
  const [fetchingDocuments, setFetchingDocuments] = useState(false);

  // Fetch lead documents
  const fetchLeadDocuments = async (leadId: number) => {
    setFetchingDocuments(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/lead/${leadId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      if (response.ok) {
        const documents = await response.json();
        console.log('Fetched documents:', documents);
        
        // Map document types to form fields
        const docTypeMap: { [key: string]: string } = {
          'aadhar_front': 'aadharFront',
          'aadhar_back': 'aadharBack',
          'pan_card': 'panCard',
          'rc_front': 'rcFront',
          'rc_back': 'rcBack',
          'bank_statement': 'bankStatement',
          'loan_statement': 'loanStatement',
        };
        
        // Fetch and convert each document to File object
        for (const doc of documents) {
          const formField = docTypeMap[doc.document_type];
          if (formField && doc.file_url) {
            try {
              const fileResponse = await fetch(doc.file_url);
              const blob = await fileResponse.blob();
              const fileName = doc.file_url.split('/').pop() || `${doc.document_type}.pdf`;
              const file = new File([blob], fileName, { type: blob.type });
              setForm(f => ({ ...f, [formField]: file }));
            } catch (err) {
              console.error(`Error fetching document ${doc.document_type}:`, err);
            }
          }
        }
        
        if (documents.length > 0) {
          toast.success(`${documents.length} document(s) loaded from lead`);
        }
      }
    } catch (error) {
      console.error('Error fetching lead documents:', error);
    } finally {
      setFetchingDocuments(false);
    }
  };

  const fetchVehicleDetails = async (rcNumber: string) => {
    if (!rcNumber || rcNumber.length < 8) {
      toast.error('Please enter a valid vehicle number (minimum 8 characters)');
      return;
    }
    
    setFetchingVehicleData(true);
    try {
      console.log('Fetching vehicle details for:', rcNumber);
      toast.info('Fetching vehicle details...');
      
      const response = await fetch('https://kyc-api.surepass.app/api/v1/rc/rc-v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc2NjM5ODg5MiwianRpIjoiMjdiNjdiNWEtZjkyZC00YTZmLTk2NmMtMDhhZjc4ZjAwNmI2IiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LmZpbm9uZXN0aW5kaWFAc3VyZXBhc3MuaW8iLCJuYmYiOjE3NjYzOTg4OTIsImV4cCI6MjM5NzExODg5MiwiZW1haWwiOiJmaW5vbmVzdGluZGlhQHN1cmVwYXNzLmlvIiwidGVuYW50X2lkIjoibWFpbiIsInVzZXJfY2xhaW1zIjp7InNjb3BlcyI6WyJ1c2VyIl19fQ.dl1S5S3OxNs3hwxkwtLhcTAN6CmIlYa_hg4yOl5ASlg'
        },
        body: JSON.stringify({ id_number: rcNumber }),
      });
      
      const rcData = await response.json();
      console.log('RC API Response:', rcData);
      console.log('Success status:', rcData.success);
      console.log('Full API Response:', JSON.stringify(rcData, null, 2));
      
      if (!rcData.success) {
        console.error('API Error Response:', rcData);
        throw new Error(rcData.message || 'Failed to fetch vehicle details');
      }
      
      if (rcData.data) {
        const rc = rcData.data;
        console.log('RC Data fields:', Object.keys(rc));
        console.log('Engine Number:', rc.engine_number);
        console.log('Chassis Number:', rc.chassis_number);
        console.log('Owner Name:', rc.owner_name);
        console.log('Maker Description:', rc.maker_description);
        console.log('Maker Model:', rc.maker_model);
        console.log('Fuel Type:', rc.fuel_type);
        
        // Helper function to convert date from DD/MM/YYYY or MM/YYYY to YYYY-MM-DD
        const convertDate = (dateStr: string) => {
          if (!dateStr) return '';
          // Handle MM/YYYY format (e.g., "11/2016")
          if (dateStr.includes('/') && dateStr.split('/').length === 2) {
            const [month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-01`;
          }
          // Handle DD/MM/YYYY format
          if (dateStr.includes('/') && dateStr.split('/').length === 3) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          // Handle DD-MM-YYYY format
          if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
            const [day, month, year] = dateStr.split('-');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          // Already in YYYY-MM-DD format
          return dateStr;
        };
        
        setForm(f => ({
          ...f,
          engineNumber: rc.vehicle_engine_number || '',
          chassisNumber: rc.vehicle_chasi_number || '',
          ownerName: rc.owner_name || '',
          makerName: rc.maker_description || '',
          makerModel: rc.maker_model || '',
          fuelType: rc.fuel_type || '',
          manufacturingDate: convertDate(rc.manufacturing_date || ''),
          insuranceCompany: rc.insurance_company || '',
          insuranceValidUpto: rc.insurance_upto || '',
          puccValidUpto: rc.pucc_upto || '',
          financer: rc.financer || '',
          financeStatus: rc.financed ? 'Financed' : 'Not Financed',
          ownershipType: rc.owner_number === '1' ? 'First Owner' : rc.owner_number === '2' ? 'Second Owner' : rc.owner_number === '3' ? 'Third Owner' : rc.owner_number === '4' ? 'Fourth Owner' : '',
        }));
        
        console.log('Form updated with values');
        toast.success('Vehicle details fetched successfully!');
      } else {
        toast.error(rcData.message || 'Could not fetch vehicle details');
      }
    } catch (error: any) {
      console.error('Error fetching vehicle details:', error);
      toast.error(error.message || 'Failed to fetch vehicle details');
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
    vehicleNumber: '', engineNumber: '', chassisNumber: '', ownerName: '', makerName: '',
    makerModel: '', modelVariantName: '', fuelType: '', manufacturingDate: '',
    ownershipType: '', financer: '', financeStatus: '', insuranceCompany: '', insuranceValidUpto: '',
    puccValidUpto: '', caseType: '',
    // Income Details
    incomeSource: '', monthlyIncome: '',
    // Salaried Income Details
    companyName: '', designation: '', workExperience: '', currentJobYears: '', totalWorkExp: '',
    netMonthlySalary: '', salaryCreditMode: '', salarySlipAvailable: '',
    // Self Employed Details
    profile: '', itrAvailable: '', annualIncomeItr: '', businessName: '', businessType: '', businessVintage: '', professionalSubtype: '', practiceExperience: '',
    // Freelancer/Agent Details
    freelancerSubtype: '',
    // Other Income Details
    otherIncomeType: '',
    // Financier Name
    financierName: '', otherFinancierName: '', financierLocation: '',
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
      caseType: lead.case_type || '',
      loanAmount: lead.loan_amount_required ? String(lead.loan_amount_required) : '',
      purposeLoanAmount: lead.loan_amount_required ? String(lead.loan_amount_required) : '',
      loanTypeVehicle: lead.case_type === 'purchase' ? 'New Vehicle Loan' : 'Used Vehicle Loan',
      scheme: lead.case_type === 'purchase' ? 'Purchase' : lead.case_type === 'refinance' ? 'Re-finance' : 'Balance Transfer',
      financierName: lead.financier_name || '',
      sourcingPersonName: lead.created_by_name || lead.sourcing_person_name || '',
    }));
    
    // Fetch documents for this lead
    if (lead.id) {
      fetchLeadDocuments(lead.id);
    }
    
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
          selected_financier: form.financierName === 'Others' ? form.otherFinancierName : form.financierName,
          financier_location: form.financierLocation || null,
          loan_amount: Number(form.loanAmount) || 0,
          ltv: Number(form.ltv) || null,
          loan_type_vehicle: form.loanTypeVehicle || null,
          vehicle_number: form.vehicleNumber || null,
          engine_number: form.engineNumber || null,
          chassis_number: form.chassisNumber || null,
          owner_name: form.ownerName || null,
          maker_name: form.makerName || null,
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
          bank_name: assignmentForm.ledgerSelection || null,
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

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.mobile.trim() || !form.loanAmount) {
      toast.error('Customer Name, Mobile, and Loan Amount are required');
      return;
    }
    setShowAssignmentModal(true);
  };

  const handleCreateApplication = () => {
    createLoan.mutate();
    setShowAssignmentModal(false);
  };



  // Check if mandatory documents are uploaded (for executive and team_leader roles)
  const isExecutive = user?.role === 'executive';
  const isTeamLeader = user?.role === 'team_leader';
  const mandatoryDocsUploaded = form.aadharFront && form.aadharBack && form.panCard && form.rcFront && form.rcBack;
  const showOtherDocs = (!isExecutive && !isTeamLeader) || mandatoryDocsUploaded;

  const inputClass = "w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
  const labelClass = "block text-[10px] font-medium text-foreground/70 mb-1";

  return (
    <>
      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Assignment Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Select Ledger *</label>
                <select 
                  className={inputClass}
                  value={assignmentForm.ledgerSelection}
                  onChange={e => setAssignmentForm(f => ({ ...f, ledgerSelection: e.target.value }))}
                  required
                >
                  <option value="">Choose Ledger</option>
                  {LEDGER_OPTIONS.map((ledger) => (
                    <option key={ledger} value={ledger}>
                      {ledger}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sales Manager</label>
                <input 
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none transition-all cursor-not-allowed"
                  value={assignmentForm.salesManager}
                  disabled
                />
              </div>
              
              <div>
                <label className={labelClass}>Remarks (Optional)</label>
                <textarea 
                  className={inputClass}
                  rows={3}
                  value={assignmentForm.remarks}
                  onChange={e => setAssignmentForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder="Add any additional remarks..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setShowAssignmentModal(false)}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white/40 dark:hover:bg-white/5 border border-transparent transition-all duration-300"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => {
                  const message = `*Loan Application Details*\n\n` +
                    `Customer: ${form.customerName}\n` +
                    `Mobile: ${form.mobile}\n` +
                    `Loan Amount: ₹${form.loanAmount}\n` +
                    `Vehicle: ${form.makerName} ${form.makerModel}\n` +
                    `Vehicle No: ${form.vehicleNumber}\n` +
                    `Ledger: ${assignmentForm.ledgerSelection
