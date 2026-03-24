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

// Helper component for document previews
const DocumentPreview = ({ file }: { file: File | null }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  if (!file) return null;

  return (
    <div className="mt-1 flex items-center gap-2">
      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {file.name}
      </p>
      {previewUrl && (
        <div className="relative group">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-10 h-10 object-cover rounded shadow-sm border border-border group-hover:scale-110 transition-transform cursor-zoom-in" 
            onClick={() => window.open(previewUrl, '_blank')} 
          />
        </div>
      )}
      {file.type === 'application/pdf' && (
        <button 
          type="button"
          onClick={() => {
            const url = URL.createObjectURL(file);
            window.open(url, '_blank');
            // Revoke after a delay as it opens in new tab
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
          className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 hover:bg-red-100 transition-colors"
        >
          PDF
        </button>
      )}
    </div>
  );
};

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

  const { data: lenders = [] } = useQuery({
    queryKey: ['lenders-from-banks'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) {
          return ['Others']; // Fallback
        }
        const banksData = await response.json();
        // Extract bank names and add 'Others' option
        const bankNames = banksData.map((bank: any) => bank.name).filter(Boolean);
        return [...bankNames, 'Others'];
      } catch {
        return ['Others']; // Fallback if fetch fails
      }
    },
  });

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/by-role?roles=branch_manager,dsa,executive`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
    enabled: user?.role === 'admin'
  });

  const { data: brokers = [] } = useQuery({
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
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null); // Store lead ID
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
    selectedBankId: '',
    selectedBranchId: '',
    selectedBranchName: '',
    salesManagerName: '',
    salesManagerMobile: '',
    areaManagerName: '',
    areaManagerMobile: '',
    assignedTo: '',
    assignedToRole: '',
    remarks: ''
  });
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // When lender is selected, find matching bank and fetch its branches
  const handleLenderChange = async (lenderName: string) => {
    setAssignmentForm(f => ({
      ...f,
      ledgerSelection: lenderName,
      selectedBankId: '',
      selectedBranchId: '',
      selectedBranchName: '',
      salesManagerName: '',
      salesManagerMobile: '',
      areaManagerName: '',
      areaManagerMobile: '',
    }));
    setBranchOptions([]);
    if (!lenderName || lenderName === 'Others') return;
    const matchedBank = (banks as any[]).find(b => b.name.toLowerCase() === lenderName.toLowerCase());
    if (!matchedBank) return;
    setLoadingBranches(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks/${matchedBank.id}/branches`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranchOptions(data);
        setAssignmentForm(f => ({ ...f, selectedBankId: String(matchedBank.id) }));
      }
    } catch { /* ignore */ }
    finally { setLoadingBranches(false); }
  };

  const handleBranchChange = (branchId: string) => {
    const branch = branchOptions.find(b => String(b.id) === branchId);
    setAssignmentForm(f => ({
      ...f,
      selectedBranchId: branchId,
      selectedBranchName: branch?.branch_name || '',
      salesManagerName: branch?.sales_manager_name || '',
      salesManagerMobile: branch?.sales_manager_mobile || '',
      areaManagerName: branch?.area_sales_manager_name || '',
      areaManagerMobile: branch?.area_sales_manager_mobile || '',
    }));
  };

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
        console.log('Document types received:', documents.map((d: any) => d.document_type));
        
        // Map document types to form fields
        const docTypeMap: { [key: string]: string } = {
          'aadhar_front': 'aadharFront',
          'aadhar_back': 'aadharBack',
          'aadhaar_front': 'aadharFront',
          'aadhaar_back': 'aadharBack',
          'aadhar': 'aadharFront',
          'aadhaar': 'aadharFront',
          'pan_card': 'panCard',
          'pan': 'panCard',
          'rc_front': 'rcFront',
          'rc_back': 'rcBack',
          'rc': 'rcFront',
          'bank_statement': 'bankStatement',
          'loan_statement': 'loanStatement',
          'driving_licence': 'drivingLicence',
          'driving_license': 'drivingLicence',
          'light_bill': 'lightBill',
          'cheque': 'cheque',
          'income_proof': 'incomeProof',
          'rent_agreement': 'rentAgreement',
          'customer_photo': 'customerPhoto',
          'disbursement_memo': 'disbursementMemo',
          'insurance': 'insurance',
          'customer_ledger': 'customerLedger',
        };
        
        let loadedCount = 0;
        let failedCount = 0;

        // Fetch and convert each document to File object
        const missingDocs: string[] = [];
        for (const doc of documents) {
          const docType = doc.document_type?.toLowerCase().trim() || '';
          const formField = docTypeMap[docType];
          const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${doc.id}/download`;
          
          console.log(`Processing document: ${doc.document_type} (normalized: ${docType}) -> ${formField}`);
          
          if (!formField) {
            console.warn(`⚠️ Unmapped document type: ${doc.document_type}`);
            continue;
          }
          
          try {
            const fileResponse = await fetch(downloadUrl, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            
            if (fileResponse.ok) {
              const blob = await fileResponse.blob();
              const fileName = doc.file_name || `${doc.document_type}.pdf`;
              const file = new File([blob], fileName, { type: blob.type });
              setForm(f => ({ ...f, [formField]: file }));
              console.log(`✅ Successfully loaded ${doc.document_type}`);
              loadedCount++;
            } else {
              console.error(`❌ Failed to download ${doc.document_type}: ${fileResponse.statusText}`);
              missingDocs.push(doc.document_type.replace(/_/g, ' '));
              failedCount++;
            }
          } catch (err) {
            console.error(`❌ Error fetching document ${doc.document_type}:`, err);
            failedCount++;
          }
        }

        if (missingDocs.length > 0) {
          toast.error(`Some documents are missing on the server: ${missingDocs.join(', ')}. Please re-upload them.`, {
            duration: 6000
          });
        }
        
        if (loadedCount > 0) {
          toast.success(`${loadedCount} document(s) loaded from lead`);
        }
        if (failedCount > 0) {
          toast.warning(`${failedCount} document(s) could not be loaded. Please check the console for details.`);
        }
        if (documents.length === 0) {
          toast.info('No documents found for this lead.');
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
    console.log('Fetching vehicle details for:', rcNumber); // Debug log

    const applyRCData = (rc: any) => {
      console.log('Applying RC data:', rc); // Debug log
      const convertDate = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('/') && dateStr.split('/').length === 2) {
          const [month, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-01`;
        }
        if (dateStr.includes('/') && dateStr.split('/').length === 3) {
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
        engineNumber: rc.vehicle_engine_number || '',
        chassisNumber: rc.vehicle_chasi_number || '',
        ownerName: rc.owner_name || '',
        makerName: rc.maker_description || '',
        makerModel: rc.maker_model || '',
        fuelType: rc.fuel_type || '',
        manufacturingDate: convertDate(rc.manufacturing_date || rc.manufacturing_date_formatted || ''),
        insuranceCompany: rc.insurance_company || '',
        insuranceValidUpto: rc.insurance_upto || '',
        puccValidUpto: rc.pucc_upto || '',
        financer: rc.financer || '',
        financeStatus: rc.financed ? 'Financed' : 'Not Financed',
        ...(rc.financed ? { loanStatus: 'Active' } : {}),
        ownershipType: rc.owner_number === '1' ? 'First Owner' : rc.owner_number === '2' ? 'Second Owner' : rc.owner_number === '3' ? 'Third Owner' : rc.owner_number === '4' ? 'Fourth Owner' : '',
      }));
    };

    try {
      toast.info('Fetching vehicle details...');
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-verification/verify`;
      console.log('API URL:', apiUrl); // Debug log
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ rc_number: rcNumber }),
      });
      
      console.log('Response status:', res.status); // Debug log
      const data = await res.json();
      console.log('Response data:', data); // Debug log
      
      if (data.success && data.data?.rc_details) {
        applyRCData(data.data.rc_details);
        toast.success(data.from_cache ? 'Vehicle details loaded from database!' : 'Vehicle details fetched successfully!');
      } else {
        console.error('API Error:', data);
        toast.error(data.error || 'Could not fetch vehicle details');
      }
    } catch (error: any) {
      console.error('Fetch Error:', error);
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
    profile: '',  businessName: '', businessType: '', businessVintage: '', professionalSubtype: '', practiceExperience: '',itrAvailable: '', annualIncomeItr: '',
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
    // Bouncing Details
    bouncingLast3m: '', bouncingLast6m: '',
    // Existing Loan Details
    loanStatus: '', existingLoanAmount: '', existingTenure: '', existingEmi: '', noOfEmiPaid: '',
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

  const update = (key: string, val: string | File | null) => {
    setForm(f => {
      const newForm = { ...f, [key]: val };
      if (key === 'totalWorkExp' && val && !f.salaryCreditMode) {
        newForm.salaryCreditMode = 'Account Transfer';
      }
      if (key === 'financeStatus' && val === 'Financed') {
        newForm.loanStatus = 'Active';
      }
      return newForm;
    });
  };

  const handleLeadSelect = (lead: any) => {
    setForm(f => ({
      ...f,
      customerId: lead.customer_id || '',
      customerName: lead.customer_name || '',
      mobile: lead.phone || lead.phone_no || '',
      currentAddress: lead.current_address || '',
      currentLandmark: lead.current_landmark || '',
      currentDistrict: lead.city || lead.district || '',
      currentState: lead.state || '',
      currentPincode: lead.pincode || '',
      vehicleNumber: lead.vehicle_number || lead.vehicle_no || '',
      caseType: lead.case_type || '',
      loanAmount: lead.loan_amount_required ? String(lead.loan_amount_required) : '',
      purposeLoanAmount: lead.loan_amount_required ? String(lead.loan_amount_required) : '',
      loanTypeVehicle: lead.case_type === 'new_car_purchase' ? 'New Vehicle Loan' : 'Used Vehicle Loan',
      scheme: lead.case_type === 'new_car_purchase' ? 'Purchase' : 
              lead.case_type === 'used_car_refinance' ? 'Re-finance' : 
              lead.case_type === 'used_car_bt' ? 'Balance Transfer' :
              lead.case_type === 'used_car_topup' ? 'Top-up' : 'Purchase',
      financierName: lead.financier_name || '',
      sourcingPersonName: lead.created_by_name || lead.sourcing_person_name || '',
    }));
    
    // Pre-populate assignment form with lead's financier if available
    if (lead.financier_name) {
      setAssignmentForm(f => ({
        ...f,
        ledgerSelection: lead.financier_name
      }));
    }
    
    // Fetch documents for this lead
    if (lead.id) {
      fetchLeadDocuments(lead.id);
    }
    
    toast.success(`Lead data loaded for ${lead.customer_name}`);
  };

  // Pre-fill from reapply loan data (runs immediately on mount)
  useEffect(() => {
    const isReapply = searchParams.get('reapply');
    if (isReapply !== 'true') return;
    const stored = sessionStorage.getItem('reapply_loan_data');
    if (!stored) return;
    const loan = JSON.parse(stored);
    setForm(f => ({
      ...f,
      customerId: loan.customer_id || '',
      customerName: loan.applicant_name || '',
      mobile: loan.mobile || '',
      coApplicantName: loan.co_applicant_name || '',
      coApplicantMobile: loan.co_applicant_mobile || '',
      guarantorName: loan.guarantor_name || '',
      guarantorMobile: loan.guarantor_mobile || '',
      currentAddress: loan.current_address || '',
      currentLandmark: loan.current_landmark || '',
      currentDistrict: loan.current_district || '',
      currentState: loan.current_state || '',
      currentPincode: loan.current_pincode || '',
      engineNumber: loan.engine_number || '',
      chassisNumber: loan.chassis_number || '',
      ownerName: loan.owner_name || '',
      makerName: loan.maker_name || '',
      makerModel: loan.maker_model || '',
      modelVariantName: loan.model_variant_name || '',
      fuelType: loan.fuel_type || '',
      manufacturingDate: loan.manufacturing_date ? loan.manufacturing_date.split('T')[0] : '',
      ownershipType: loan.ownership_type || '',
      financer: loan.financer || '',
      financeStatus: loan.finance_status || '',
      insuranceCompany: loan.insurance_company || '',
      insuranceValidUpto: loan.insurance_valid_upto ? loan.insurance_valid_upto.split('T')[0] : '',
      puccValidUpto: loan.pucc_valid_upto ? loan.pucc_valid_upto.split('T')[0] : '',
      caseType: loan.case_type || '',
      loanAmount: loan.loan_amount ? String(loan.loan_amount) : '',
      tenure: loan.tenure ? String(loan.tenure) : '60',
      irr: loan.irr ? String(loan.irr) : '',
      incomeSource: loan.income_source || '',
      monthlyIncome: loan.monthly_income ? String(loan.monthly_income) : loan.net_monthly_salary ? String(loan.net_monthly_salary) : '',
      // Salaried fields
      companyName: loan.company_name || '',
      designation: loan.designation || '',
      workExperience: loan.work_experience || '',
      currentJobYears: loan.current_job_years ? String(loan.current_job_years) : '',
      totalWorkExp: loan.total_work_exp ? String(loan.total_work_exp) : '',
      netMonthlySalary: loan.net_monthly_salary ? String(loan.net_monthly_salary) : '',
      salaryCreditMode: loan.salary_credit_mode || '',
      salarySlipAvailable: loan.salary_slip_available || '',
      // Self employed fields
      profile: loan.profile || '',
      itrAvailable: loan.itr_available || '',
      annualIncomeItr: loan.annual_income_itr ? String(loan.annual_income_itr) : '',
      businessName: loan.business_name || '',
      businessType: loan.business_type || '',
      businessVintage: loan.business_vintage ? String(loan.business_vintage) : '',
      professionalSubtype: loan.professional_subtype || '',
      practiceExperience: loan.practice_experience ? String(loan.practice_experience) : '',
      freelancerSubtype: loan.freelancer_subtype || '',
      otherIncomeType: loan.other_income_type || '',
      sourcingPersonName: loan.sourcing_person_name || '',
      financierName: loan.financier_name || loan.selected_financier || '',
      bouncingLast3m: loan.bouncing_3_months ? String(loan.bouncing_3_months) : '',
      bouncingLast6m: loan.bouncing_6_months ? String(loan.bouncing_6_months) : '',
      loanStatus: loan.existing_loan_status || '',
      existingLoanAmount: loan.existing_loan_amount ? String(loan.existing_loan_amount) : '',
      existingTenure: loan.existing_tenure ? String(loan.existing_tenure) : '',
      existingEmi: loan.existing_emi ? String(loan.existing_emi) : '',
      noOfEmiPaid: loan.no_of_emi_paid ? String(loan.no_of_emi_paid) : '',
    }));
    sessionStorage.removeItem('reapply_loan_data');
    toast.success('Loan data pre-filled. Edit and submit to reapply.');
  }, []);

  // Auto-fetch lead data when leadId is in URL
  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId && leads.length > 0) {
      const lead = leads.find((l: any) => l.id === Number(leadId));
      if (lead) {
        setSelectedLeadId(Number(leadId));
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
      
      console.log('Creating loan with lead_id:', selectedLeadId); // Debug log
      console.log('Case type being sent:', form.caseType); // Debug log
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          id: loanId,
          loan_number: loanId,
          lead_id: selectedLeadId, // Use stored lead ID
          customer_id: form.customerId || null,
          applicant_name: form.customerName,
          mobile: form.mobile,
          co_applicant_name: form.coApplicantName || null,
          co_applicant_mobile: form.coApplicantMobile || null,
          guarantor_name: form.guarantorName || null,
          guarantor_mobile: form.guarantorMobile || null,
          current_address: form.currentAddress || null,
          current_landmark: form.currentLandmark || null,
          landmark: form.currentLandmark || null,
          current_district: form.currentDistrict || null,
          current_state: form.currentState || null,
          current_pincode: form.currentPincode || null,
          our_branch: form.ourBranch || null,
          income_source: form.incomeSource || null,
          monthly_income: form.monthlyIncome ? Number(form.monthlyIncome) : null,
          company_name: form.companyName || null,
          designation: form.designation || null,
          work_experience: form.workExperience || null,
          current_job_years: form.currentJobYears || null,
          total_work_exp: form.totalWorkExp || null,
          net_monthly_salary: Number(form.netMonthlySalary) || null,
          salary_credit_mode: form.salaryCreditMode || null,
          salary_slip_available: form.salarySlipAvailable || null,
          profile: form.profile || null,
          itr_available: form.itrAvailable || null,
          annual_income_itr: Number(form.annualIncomeItr) || null,
          business_name: form.businessName || null,
          business_type: form.businessType || null,
          business_vintage: form.businessVintage || null,
          professional_subtype: form.professionalSubtype || null,
          practice_experience: form.practiceExperience || null,
          freelancer_subtype: form.freelancerSubtype || null,
          other_income_type: form.otherIncomeType || null,
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
          bouncing_last_3m: form.bouncingLast3m ? Number(form.bouncingLast3m) : null,
          bouncing_last_6m: form.bouncingLast6m ? Number(form.bouncingLast6m) : null,
          existing_loan_status: form.loanStatus || null,
          existing_loan_amount: form.existingLoanAmount ? Number(form.existingLoanAmount) : null,
          existing_tenure: form.existingTenure ? Number(form.existingTenure) : null,
          existing_emi: form.existingEmi ? Number(form.existingEmi) : null,
          no_of_emi_paid: form.noOfEmiPaid ? Number(form.noOfEmiPaid) : null,
          remark: form.remark || null,
          status: (form.fileStatus === 'draft' ? 'submitted' : form.fileStatus) || 'submitted',
          financier_name: assignmentForm.ledgerSelection || (form.financierName === 'Others' ? form.otherFinancierName : form.financierName) || null,
          financier_branch_name: assignmentForm.selectedBranchName || null,
          financier_executive_name: assignmentForm.salesManagerName || null,
          financier_executive_mobile: assignmentForm.salesManagerMobile || null,
          financier_area_manager_name: assignmentForm.areaManagerName || null,
          financier_area_manager_mobile: assignmentForm.areaManagerMobile || null,
          case_type: form.caseType === 'new_car_purchase' ? 'Purchase' : 
                     form.caseType === 'used_car_purchase' ? 'Purchase' :
                     form.caseType === 'used_car_refinance' ? 'Refinance' : 
                     form.caseType === 'used_car_bt' ? 'BT' :
                     form.caseType === 'used_car_topup' ? 'Top-up' : (form.caseType || null),
          assigned_to: assignmentForm.assignedTo ? Number(assignmentForm.assignedTo) : null,
          created_by: user?.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to create loan');
      return res.json();
    },
    onSuccess: async (data) => {
      // Upload documents linked to the new loan
      const docFieldMap: { [key: string]: string } = {
        aadharFront: 'aadhar_front', aadharBack: 'aadhar_back', panCard: 'pan_card',
        rcFront: 'rc_front', rcBack: 'rc_back', drivingLicence: 'driving_licence',
        lightBill: 'light_bill', bankStatement: 'bank_statement', cheque: 'cheque',
        incomeProof: 'income_proof', rentAgreement: 'rent_agreement', customerPhoto: 'customer_photo',
        disbursementMemo: 'disbursement_memo', insurance: 'insurance', customerLedger: 'customer_ledger',
        coAadharFront: 'co_aadhar_front', coAadharBack: 'co_aadhar_back', coPanCard: 'co_pan_card',
        coPhoto: 'co_photo', guarantorAadharFront: 'guarantor_aadhar_front',
        guarantorAadharBack: 'guarantor_aadhar_back', guarantorPanCard: 'guarantor_pan_card',
        guarantorRcFront: 'guarantor_rc_front', guarantorRcBack: 'guarantor_rc_back', guarantorPhoto: 'guarantor_photo',
      };
      const loanId = data.id;
      const leadId = selectedLeadId;
      const uploadPromises = Object.entries(docFieldMap)
        .filter(([field]) => (form as any)[field])
        .map(([field, docType]) => {
          const formData = new FormData();
          formData.append('document', (form as any)[field]);
          formData.append('document_type', docType);
          if (leadId) formData.append('lead_id', String(leadId));
          if (loanId) formData.append('loan_id', String(loanId));
          return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
            body: formData,
          });
        });
      if (uploadPromises.length > 0) {
        await Promise.allSettled(uploadPromises);
      }
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-foreground mb-4">Assignment Details</h3>
            
            <div className="space-y-4">
              {/* Lender */}
              <div>
                <label className={labelClass}>Select Lender *</label>
                <select 
                  className={inputClass}
                  value={assignmentForm.ledgerSelection}
                  onChange={e => handleLenderChange(e.target.value)}
                  required
                >
                  <option value="">Choose lender</option>
                  {lenders.map((lender) => (
                    <option key={lender} value={lender}>{lender}</option>
                  ))}
                </select>
              </div>

              {/* Branch dropdown — shown when branches exist */}
              {assignmentForm.ledgerSelection && assignmentForm.ledgerSelection !== 'Others' && (
                <div>
                  <label className={labelClass}>Select Branch {loadingBranches && <span className="text-muted-foreground">(loading...)</span>} {branchOptions.length > 0 && <span className="text-red-500">*</span>}</label>
                  <select
                    className={inputClass}
                    value={assignmentForm.selectedBranchId}
                    onChange={e => handleBranchChange(e.target.value)}
                    disabled={loadingBranches || branchOptions.length === 0}
                    required={branchOptions.length > 0}
                  >
                    <option value="">{branchOptions.length === 0 ? '— No branches added —' : '— Select branch —'}</option>
                    {branchOptions.map((b: any) => (
                      <option key={b.id} value={String(b.id)}>{b.branch_name}{b.location ? ` (${b.location})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Auto-filled SM / AM details */}
              {assignmentForm.selectedBranchId && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Branch Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Sales Manager</p>
                      <p className="text-xs font-semibold text-foreground">{assignmentForm.salesManagerName || '—'}</p>
                      <p className="text-[10px] text-accent">{assignmentForm.salesManagerMobile || ''}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Area Manager</p>
                      <p className="text-xs font-semibold text-foreground">{assignmentForm.areaManagerName || '—'}</p>
                      <p className="text-[10px] text-accent">{assignmentForm.areaManagerMobile || ''}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {user?.role === 'admin' && (
                <div>
                  <label className={labelClass}>Assign To</label>
                  <select 
                    className={inputClass}
                    value={assignmentForm.assignedTo}
                    onChange={e => {
                      const selectedUser = assignableUsers.find((u: any) => u.id === Number(e.target.value));
                      setAssignmentForm(f => ({ 
                        ...f, 
                        assignedTo: e.target.value,
                        assignedToRole: selectedUser?.role || ''
                      }));
                    }}
                  >
                    <option value="">Select Branch Manager, DSA, or Executive</option>
                    {assignableUsers.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className={labelClass}>Remarks (Optional)</label>
                <textarea 
                  className={inputClass}
                  rows={2}
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
                onClick={handleCreateApplication}
                disabled={!assignmentForm.ledgerSelection || (branchOptions.length > 0 && !assignmentForm.selectedBranchId) || createLoan.isPending}
                className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-full text-sm font-bold text-secondary bg-primary hover:shadow-md hover:scale-105 transition-all duration-300 border border-primary/30 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {createLoan.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Application</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="w-full max-w-full">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground mb-2">New Loan Application</h1>
      </div>

      <form onSubmit={handleNext} className="w-full max-w-full">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm mb-4 space-y-6 w-full">
          {/* Customer Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Customer Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financierName} onChange={e => update('financierName', e.target.value)} placeholder=" " /><label className={labelClass}>Financier Name</label></div>
                
                {/* Co-Applicant Section */}
                <div className="col-span-2 md:col-span-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowOptionalFields(s => ({ ...s, coApplicant: !s.coApplicant }))}
                    className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    {showOptionalFields.coApplicant ? '−' : '+'} Add Co-Applicant Details
                  </button>
                  {showOptionalFields.coApplicant && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantName} onChange={e => update('coApplicantName', e.target.value)} placeholder=" " /><label className={labelClass}>Co-Applicant Name</label></div>
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantMobile} onChange={e => update('coApplicantMobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Co-Applicant Mobile</label></div>
                    </div>
                  )}
                </div>
                
                {/* Guarantor Section */}
                <div className="col-span-2 md:col-span-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowOptionalFields(s => ({ ...s, guarantor: !s.guarantor }))}
                    className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    {showOptionalFields.guarantor ? '−' : '+'} Add Guarantor Details
                  </button>
                  {showOptionalFields.guarantor && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorName} onChange={e => update('guarantorName', e.target.value)} placeholder=" " /><label className={labelClass}>Guarantor Name</label></div>
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorMobile} onChange={e => update('guarantorMobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Guarantor Mobile</label></div>
                    </div>
                  )}
                </div>
                
                <div className="md:col-span-3 mt-3"><h3 className="font-semibold text-foreground mb-2 text-sm">Current Address</h3></div>
                <div className="col-span-2 md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={2} value={form.currentAddress} onChange={e => update('currentAddress', e.target.value)} placeholder=" " /><label className={labelClass}>Address</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentLandmark} onChange={e => update('currentLandmark', e.target.value)} placeholder=" " /><label className={labelClass}>Landmark</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentDistrict} onChange={e => update('currentDistrict', e.target.value)} placeholder=" " /><label className={labelClass}>District</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentState} onChange={e => update('currentState', e.target.value)} placeholder=" " /><label className={labelClass}>State</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.currentPincode} onChange={e => update('currentPincode', e.target.value)} maxLength={6} placeholder=" " /><label className={labelClass}>Pincode</label></div>
              </div>
            </div>

         

          {/* Vehicle & Loan */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Vehicle & Loan Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="relative floating-input-wrapper">
                  <input 
                    className="w-full px-3 py-2 pr-10 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" 
                    value={form.vehicleNumber} 
                    onChange={e => {
                      const value = e.target.value.toUpperCase();
                      update('vehicleNumber', value);
                    }}
                    placeholder=" "
                  />
                  <label className={labelClass}>Vehicle Reg. No</label>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Search button clicked, vehicle number:', form.vehicleNumber); // Debug log
                      fetchVehicleDetails(form.vehicleNumber);
                    }}
                    disabled={!form.vehicleNumber || form.vehicleNumber.length < 8 || fetchingVehicleData}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-accent hover:text-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title={!form.vehicleNumber || form.vehicleNumber.length < 8 ? 'Enter at least 8 characters' : 'Fetch vehicle details'}
                  >
                    {fetchingVehicleData ? (
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                  </button>
                </div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.makerName} onChange={e => update('makerName', e.target.value)} placeholder=" " /><label className={labelClass}>Vehicle Company Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.makerModel} onChange={e => update('makerModel', e.target.value)} placeholder=" " /><label className={labelClass}>Vehicle Model</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.engineNumber} onChange={e => update('engineNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Engine Number</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.chassisNumber} onChange={e => update('chassisNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Chassis Number</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder=" " /><label className={labelClass}>Owner Name</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.fuelType} onChange={e => update('fuelType', e.target.value)} placeholder=" " /><label className={labelClass}>Fuel Type</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.manufacturingDate} onChange={e => update('manufacturingDate', e.target.value)} placeholder=" " /><label className={labelClass}>Manufacturing Date</label></div>
                <div className="floating-input-wrapper"><select className={inputClass} value={form.ownershipType} onChange={e => update('ownershipType', e.target.value)}><option value="">Select</option><option value="First Owner">First Owner</option><option value="Second Owner">Second Owner</option><option value="Third Owner">Third Owner</option><option value="Fourth Owner">Fourth Owner</option></select><label className={labelClass}>Ownership Type</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financer} onChange={e => update('financer', e.target.value)} placeholder=" " /><label className={labelClass}>Financer</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financeStatus} onChange={e => update('financeStatus', e.target.value)} placeholder=" " /><label className={labelClass}>Finance Status</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.insuranceCompany} onChange={e => update('insuranceCompany', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Company</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.insuranceValidUpto} onChange={e => update('insuranceValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Valid Upto</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.puccValidUpto} onChange={e => update('puccValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>PUCC Valid Upto</label></div>
                <div className="floating-input-wrapper">
                  <select className={inputClass} value={form.caseType} onChange={e => update('caseType', e.target.value)}>
                    <option value="">Select Case Type</option>
                    <option value="new_car_purchase">New Car - Purchase</option>
                    <option value="used_car_purchase">Used Car - Purchase</option>
                    <option value="used_car_refinance">Used Car - Refinance</option>
                    <option value="used_car_topup">Used Car - Top-up</option>
                    <option value="used_car_bt">Used Car - BT</option>
                  </select>
                  <label className={labelClass}>Case Type *</label>
                </div>
              </div>
            </div>

             {/* Existing Loan & EMI Details */}
          {form.financeStatus === 'Financed' && (
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Existing Loan & EMI Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper">
                <select className={inputClass} value={form.loanStatus} onChange={e => update('loanStatus', e.target.value)}>
                  <option value="">Select Status</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="No">No</option>
                </select>
                <label className={labelClass}>Loan Status</label>
              </div>
              {form.loanStatus === 'Active' && (
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.existingLoanAmount} onChange={e => update('existingLoanAmount', e.target.value)} placeholder=" " max="9999999" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 7) t.value = t.value.slice(0,7); }} /><label className={labelClass}>Loan Amount</label></div>
              )}
              {form.existingLoanAmount && (
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.existingTenure} onChange={e => update('existingTenure', e.target.value)} placeholder=" " max="360" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 3) t.value = t.value.slice(0,3); }} /><label className={labelClass}>Tenure (Months)</label></div>
              )}
              {form.existingTenure && (
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.existingEmi} onChange={e => update('existingEmi', e.target.value)} placeholder=" " max="999999" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 6) t.value = t.value.slice(0,6); }} /><label className={labelClass}>EMI Amount</label></div>
              )}
              {form.existingEmi && (
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.noOfEmiPaid} onChange={e => update('noOfEmiPaid', e.target.value)} placeholder=" " max="360" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 3) t.value = t.value.slice(0,3); }} /><label className={labelClass}>No of EMI Paid</label></div>
              )}
              {form.noOfEmiPaid && (
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.bouncingLast3m} onChange={e => update('bouncingLast3m', e.target.value)} placeholder=" " max="9" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 1) t.value = t.value.slice(0,1); }} /><label className={labelClass}>Bouncing in Last 3M</label></div>
              )}
              {form.bouncingLast3m && (
                <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.bouncingLast6m} onChange={e => update('bouncingLast6m', e.target.value)} placeholder=" " max="9" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 1) t.value = t.value.slice(0,1); }} /><label className={labelClass}>Bouncing in Last 6M</label></div>
              )}
            </div>
          </div>
          )}

          {/* Income Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Income Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="floating-input-wrapper">
                <select className={inputClass} value={form.incomeSource} onChange={e => update('incomeSource', e.target.value)}>
                  <option value="">Select Income Source</option>
                  <option value="Salaried">Salaried</option>
                  <option value="Self Employed">Self Employed</option>
                </select>
                <label className={labelClass}>Income Source</label>
              </div>
            </div>

            {/* Salaried Income Fields */}
            {form.incomeSource === 'Salaried' && (
              <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-muted">
                <h3 className="text-sm font-semibold text-foreground mb-3">Salaried Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="floating-input-wrapper">
                    <input className={inputClass} value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder=" " />
                    <label className={labelClass}>Company Name</label>
                  </div>
                  {form.companyName && (
                    <div className="floating-input-wrapper">
                      <input className={inputClass} value={form.designation} onChange={e => update('designation', e.target.value)} placeholder=" " />
                      <label className={labelClass}>Designation</label>
                    </div>
                  )}
                  {form.designation && (
                    <div className="floating-input-wrapper">
                      <input type="number" className={inputClass} value={form.netMonthlySalary} onChange={e => update('netMonthlySalary', e.target.value)} placeholder=" " max="99999" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 5) t.value = t.value.slice(0,5); }} />
                      <label className={labelClass}>Net Monthly Salary</label>
                    </div>
                  )}
                  {form.netMonthlySalary && (
                    <div className="floating-input-wrapper">
                      <select className={inputClass} value={form.salarySlipAvailable} onChange={e => update('salarySlipAvailable', e.target.value)}>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                      <label className={labelClass}>Salary Slip Available</label>
                    </div>
                  )}
                  {form.salarySlipAvailable && (
                    <div className="floating-input-wrapper">
                      <input type="number" className={inputClass} value={form.currentJobYears} onChange={e => update('currentJobYears', e.target.value)} placeholder=" " max="99" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 2) t.value = t.value.slice(0,2); }} />
                      <label className={labelClass}>Current Job (In Yrs)</label>
                    </div>
                  )}
                  {form.currentJobYears && (
                    <div className="floating-input-wrapper">
                      <input type="number" className={inputClass} value={form.totalWorkExp} onChange={e => update('totalWorkExp', e.target.value)} placeholder=" " max="99" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 2) t.value = t.value.slice(0,2); }} />
                      <label className={labelClass}>Total Work Exp. (In Yrs)</label>
                    </div>
                  )}
                  {form.totalWorkExp && (
                    <div className="floating-input-wrapper">
                      <select className={inputClass} value={form.salaryCreditMode || 'Account Transfer'} onChange={e => update('salaryCreditMode', e.target.value)}>
                        <option value="Account Transfer">Account Transfer</option>
                        <option value="Cash">Cash</option>
                      </select>
                      <label className={labelClass}>Salary Credit Mode</label>
                    </div>
                  )}
                  {(form.salaryCreditMode || form.totalWorkExp) && (
                    <div className="floating-input-wrapper">
                      <select className={inputClass} value={form.itrAvailable} onChange={e => update('itrAvailable', e.target.value)}>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                      <label className={labelClass}>ITR Available</label>
                    </div>
                  )}
                  {form.itrAvailable === 'Yes' && (
                    <div className="floating-input-wrapper">
                      <input type="number" className={inputClass} value={form.annualIncomeItr} onChange={e => update('annualIncomeItr', e.target.value)} placeholder=" " />
                      <label className={labelClass}>Annual Income (As Per Latest ITR)</label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Self Employed Fields */}
            {form.incomeSource === 'Self Employed' && (
              <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-muted">
                <h3 className="text-sm font-semibold text-foreground mb-3">Self Employed Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="floating-input-wrapper">
                    <select className={inputClass} value={form.profile} onChange={e => update('profile', e.target.value)}>
                      <option value="">Select Profile</option>
                      <option value="Business">Business</option>
                      <option value="Professional">Professional</option>
                      <option value="Freelancer/Agent">Freelancer/Agent</option>
                      <option value="Farmer">Farmer</option>
                      <option value="Other Income">Other Income</option>
                    </select>
                    <label className={labelClass}>Profile</label>
                  </div>

                  {form.profile && (
                    <>
                      {form.profile === 'Business' && (
                        <>
                          <div className="floating-input-wrapper"><input className={inputClass} value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder=" " /><label className={labelClass}>Business Name</label></div>
                          {form.businessName && <div className="floating-input-wrapper"><input className={inputClass} value={form.businessType} onChange={e => update('businessType', e.target.value)} placeholder=" " /><label className={labelClass}>Business Type</label></div>}
                          {form.businessType && <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.businessVintage} onChange={e => update('businessVintage', e.target.value)} placeholder=" " max="99" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 2) t.value = t.value.slice(0,2); }} /><label className={labelClass}>Business Vintage (Years)</label></div>}
                        </>
                      )}

                      {form.profile === 'Professional' && (
                        <>
                          <div className="floating-input-wrapper">
                            <select className={inputClass} value={form.professionalSubtype} onChange={e => update('professionalSubtype', e.target.value)}>
                              <option value="">Select Subtype</option>
                              <option value="CA">CA</option>
                              <option value="Doctor">Doctor</option>
                              <option value="MBBD">MBBD</option>
                              <option value="MD/MS">MD/MS</option>
                              <option value="BDS/MDS (Dentist)">BDS/MDS (Dentist)</option>
                              <option value="Engineer">Engineer</option>
                              <option value="Architect">Architect</option>
                            </select>
                            <label className={labelClass}>Professional Subtype</label>
                          </div>
                          {form.professionalSubtype && <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.practiceExperience} onChange={e => update('practiceExperience', e.target.value)} placeholder=" " max="99" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 2) t.value = t.value.slice(0,2); }} /><label className={labelClass}>Practice Experience (In Yrs)</label></div>}
                        </>
                      )}

                      {form.profile === 'Freelancer/Agent' && (
                        <div className="floating-input-wrapper">
                          <select className={inputClass} value={form.freelancerSubtype} onChange={e => update('freelancerSubtype', e.target.value)}>
                            <option value="">Select Subtype</option>
                            <option value="IT Freelancer">IT Freelancer</option>
                            <option value="LIC Agent">LIC Agent</option>
                            <option value="Property Broker">Property Broker</option>
                            <option value="Gig Worker">Gig Worker</option>
                            <option value="Other Commission Agent">Other Commission Agent</option>
                          </select>
                          <label className={labelClass}>Subtype</label>
                        </div>
                      )}

                      {form.profile === 'Other Income' && (
                        <div className="floating-input-wrapper">
                          <input className={inputClass} value={form.otherIncomeType} onChange={e => update('otherIncomeType', e.target.value)} placeholder=" " />
                          <label className={labelClass}>Profession</label>
                        </div>
                      )}

                      {/* ITR always last */}
                      <div className="floating-input-wrapper">
                        <select className={inputClass} value={form.itrAvailable} onChange={e => update('itrAvailable', e.target.value)}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                        <label className={labelClass}>ITR Available</label>
                      </div>
                      {form.itrAvailable === 'Yes' && (
                        <div className="floating-input-wrapper">
                          <input type="number" className={inputClass} value={form.annualIncomeItr} onChange={e => update('annualIncomeItr', e.target.value)} placeholder=" " />
                          <label className={labelClass}>Annual Income (As Per Latest ITR)</label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

          </div>



          {/* Documents */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Documents</h2>
              
              {/* Customer Documents */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Customer Documents {(isExecutive || isTeamLeader) && <span className="text-xs text-red-500">(Upload mandatory documents first)</span>}</h3>
                
                {/* Mandatory Documents for Executive */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className={labelClass}>Aadhar Card Front {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!form.aadharFront && <input type="file" className={inputClass} onChange={e => update('aadharFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    <DocumentPreview file={form.aadharFront as File | null} />
                  </div>
                  <div>
                    <label className={labelClass}>Aadhar Card Back {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!form.aadharBack && <input type="file" className={inputClass} onChange={e => update('aadharBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    <DocumentPreview file={form.aadharBack as File | null} />
                  </div>
                  <div>
                    <label className={labelClass}>Pan Card {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!form.panCard && <input type="file" className={inputClass} onChange={e => update('panCard', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    <DocumentPreview file={form.panCard as File | null} />
                  </div>
                  <div>
                    <label className={labelClass}>RC (Front) {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!form.rcFront && <input type="file" className={inputClass} onChange={e => update('rcFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    <DocumentPreview file={form.rcFront as File | null} />
                  </div>
                  <div>
                    <label className={labelClass}>RC (Back) {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!form.rcBack && <input type="file" className={inputClass} onChange={e => update('rcBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    <DocumentPreview file={form.rcBack as File | null} />
                  </div>
                </div>

                {/* Other Documents - Show only after mandatory docs are uploaded */}
                {showOtherDocs ? (
                  <>
                    {(isExecutive || isTeamLeader) && <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-300">✓ Mandatory documents uploaded. You can now upload additional documents.</div>}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Driving Licence</label>
                        {!form.drivingLicence && <input type="file" className={inputClass} onChange={e => update('drivingLicence', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.drivingLicence as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Light Bill</label>
                        {!form.lightBill && <input type="file" className={inputClass} onChange={e => update('lightBill', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.lightBill as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Last 6 Month Bank Statement</label>
                        {!form.bankStatement && <input type="file" className={inputClass} onChange={e => update('bankStatement', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.bankStatement as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Cheque</label>
                        {!form.cheque && <input type="file" className={inputClass} onChange={e => update('cheque', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.cheque as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Income Proof</label>
                        {!form.incomeProof && <input type="file" className={inputClass} onChange={e => update('incomeProof', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.incomeProof as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Rent Agreement</label>
                        {!form.rentAgreement && <input type="file" className={inputClass} onChange={e => update('rentAgreement', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.rentAgreement as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Customer Photo</label>
                        {!form.customerPhoto && <input type="file" className={inputClass} onChange={e => update('customerPhoto', e.target.files?.[0] || null)} accept="image/*" />}
                        <DocumentPreview file={form.customerPhoto as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Disbursement Memo</label>
                        {!form.disbursementMemo && <input type="file" className={inputClass} onChange={e => update('disbursementMemo', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.disbursementMemo as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Insurance</label>
                        {!form.insurance && <input type="file" className={inputClass} onChange={e => update('insurance', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.insurance as File | null} />
                      </div>
                      <div>
                        <label className={labelClass}>Customer Ledger</label>
                        {!form.customerLedger && <input type="file" className={inputClass} onChange={e => update('customerLedger', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        <DocumentPreview file={form.customerLedger as File | null} />
                      </div>
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
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Next →
          </button>
        </div>
          </div>
      </form>
    </div>
    </>
  );
}
