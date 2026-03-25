import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { CAR_MAKES, calculateEMI, formatCurrency } from '@/lib/mock-data';
import { FINANCIERS } from '@/lib/financiers';
import { ArrowLeft, Calculator, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { toast } from 'sonner';
import { FloatingLabelInput, FloatingLabelTextarea, FloatingLabelSelect } from '@/components/FloatingLabelInput';
import '@/styles/floating-labels.css';

export default function EditLoan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showExistingDetails, setShowExistingDetails] = useState(false);

  const [showOptionalFields, setShowOptionalFields] = useState({
    coApplicant: false,
    guarantor: false,
  });
  const [fetchingVehicleData, setFetchingVehicleData] = useState(false);

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

  const { data: loanData, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch loan');
      return await response.json();
    },
    enabled: !!id,
  });

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
    // Application Stages
    appStage: 'submitted', appScore: '', creditScore: '', tags: '', rejectedRemarks: '',
    approvedLoanAmount: '', approvedRoi: '', approvedTenure: '',
    disbursedLoanAmount: '', disbursedRoi: '', disbursedTenure: '', loanAccountNumber: '',
    rcStatus: '', rcType: '', rcCollectedBy: '', rtoAgentNameStage: '', rtoAgentMobileStage: '',
    bankerName: '', bankerMobile: '', cancelledRemarks: '',
    // Others
    loginDate: '', approvalDate: '', sourcingPersonName: '', remark: '', fileStatus: 'submitted',
  });

  // Document files state
  const [documentFiles, setDocumentFiles] = useState<{ [key: string]: File }>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Populate form when loan data is loaded
  useEffect(() => {
    if (loanData) {
      // Pre-populate assignment form with existing loan data
      setAssignmentForm(f => ({
        ...f,
        ledgerSelection: loanData.financier_name || '',
        selectedBranchName: loanData.financier_branch_name || '',
        salesManagerName: loanData.financier_executive_name || '',
        salesManagerMobile: loanData.financier_executive_mobile || '',
        areaManagerName: loanData.financier_area_manager_name || '',
        areaManagerMobile: loanData.financier_area_manager_mobile || '',
        assignedTo: loanData.assigned_to ? String(loanData.assigned_to) : '',
      }));
      
      // If there's a financier name, try to load its branches
      if (loanData.financier_name && loanData.financier_name !== 'Others') {
        handleLenderChange(loanData.financier_name);
      }
      setForm({
        ...form,
        customerId: loanData.customer_id || '',
        customerName: loanData.applicant_name || loanData.customer_name || '',
        mobile: loanData.mobile || loanData.phone || '',
        coApplicantName: loanData.co_applicant_name || '',
        coApplicantMobile: loanData.co_applicant_mobile || '',
        guarantorName: loanData.guarantor_name || '',
        guarantorMobile: loanData.guarantor_mobile || '',
        ourBranch: loanData.our_branch || '',
        currentAddress: loanData.current_address || '',
        currentLandmark: loanData.current_landmark || '',
        currentDistrict: loanData.current_district || '',
        currentState: loanData.current_state || '',
        currentPincode: loanData.current_pincode || '',
        loanNumber: loanData.loan_number || '',
        purposeLoanAmount: loanData.purpose_loan_amount || '',
        loanAmount: loanData.loan_amount?.toString() || '',
        ltv: loanData.ltv?.toString() || '',
        loanTypeVehicle: loanData.loan_type_vehicle || '',
        vehicleNumber: loanData.vehicle_number || '',
        engineNumber: loanData.engine_number || '',
        chassisNumber: loanData.chassis_number || '',
        ownerName: loanData.owner_name || '',
        makerName: loanData.maker_name || '',
        makerModel: loanData.maker_model || '',
        modelVariantName: loanData.model_variant_name || '',
        fuelType: loanData.fuel_type || '',
        manufacturingDate: loanData.manufacturing_date ? loanData.manufacturing_date.split('T')[0] : '',
        ownershipType: loanData.ownership_type || '',
        financer: loanData.financer || '',
        financeStatus: loanData.finance_status || '',
        insuranceCompany: loanData.insurance_company || '',
        insuranceValidUpto: loanData.insurance_valid_upto ? loanData.insurance_valid_upto.split('T')[0] : '',
        puccValidUpto: loanData.pucc_valid_upto ? loanData.pucc_valid_upto.split('T')[0] : '',
        caseType: loanData.case_type || '',
        incomeSource: loanData.income_source || '',
        monthlyIncome: loanData.monthly_income?.toString() || '',
        companyName: loanData.company_name || '',
        designation: loanData.designation || '',
        workExperience: loanData.work_experience || '',
        currentJobYears: loanData.current_job_years?.toString() || '',
        totalWorkExp: loanData.total_work_exp?.toString() || '',
        netMonthlySalary: loanData.net_monthly_salary?.toString() || '',
        salaryCreditMode: loanData.salary_credit_mode || '',
        salarySlipAvailable: loanData.salary_slip_available || '',
        profile: loanData.profile || '',
        itrAvailable: loanData.itr_available || '',
        annualIncomeItr: loanData.annual_income_itr?.toString() || '',
        businessName: loanData.business_name || '',
        businessType: loanData.business_type || '',
        businessVintage: loanData.business_vintage?.toString() || '',
        professionalSubtype: loanData.professional_subtype || '',
        practiceExperience: loanData.practice_experience?.toString() || '',
        freelancerSubtype: loanData.freelancer_subtype || '',
        otherIncomeType: loanData.other_income_type || '',
        financierName: loanData.financier_name || '',
        otherFinancierName: loanData.financier_name && !FINANCIERS.includes(loanData.financier_name) ? loanData.financier_name : '',
        financierLocation: loanData.financier_location || '',
        bouncingLast3m: loanData.bouncing_last_3m ? String(loanData.bouncing_last_3m) : loanData.bouncing_3_months ? String(loanData.bouncing_3_months) : '',
        bouncingLast6m: loanData.bouncing_last_6m ? String(loanData.bouncing_last_6m) : loanData.bouncing_6_months ? String(loanData.bouncing_6_months) : '',
        loanStatus: loanData.existing_loan_status || '',
        existingLoanAmount: loanData.existing_loan_amount ? String(loanData.existing_loan_amount) : '',
        existingTenure: loanData.existing_tenure ? String(loanData.existing_tenure) : '',
        existingEmi: loanData.existing_emi ? String(loanData.existing_emi) : '',
        noOfEmiPaid: loanData.no_of_emi_paid ? String(loanData.no_of_emi_paid) : '',
        irr: loanData.irr?.toString() || loanData.interest_rate?.toString() || '',
        tenure: loanData.tenure?.toString() || '60',
        emiMode: loanData.emi_mode || 'Monthly',
        emiStartDate: loanData.emi_start_date || '',
        emiEndDate: loanData.emi_end_date || '',
        assignedBankId: loanData.assigned_bank_id?.toString() || loanData.bank_id?.toString() || '',
        assignedBrokerId: loanData.assigned_broker_id?.toString() || loanData.broker_id?.toString() || '',
        processingFee: loanData.processing_fee?.toString() || '',
        loginDate: loanData.login_date ? loanData.login_date.split('T')[0] : '',
        sourcingPersonName: loanData.sourcing_person_name || '',
        remark: loanData.remark || '',
        fileStatus: loanData.status || 'submitted',
      });
      
      // Set optional fields visibility based on data
      if (loanData.co_applicant_name || loanData.co_applicant_mobile) {
        setShowOptionalFields(prev => ({ ...prev, coApplicant: true }));
      }
      if (loanData.guarantor_name || loanData.guarantor_mobile) {
        setShowOptionalFields(prev => ({ ...prev, guarantor: true }));
      }
    }
  }, [loanData]);

  const update = (key: string, val: string | File | null) => {
    if (val instanceof File) {
      // Handle file uploads separately
      setDocumentFiles(prev => ({ ...prev, [key]: val }));
      return;
    }
    
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

  // Upload documents function
  const uploadDocuments = async () => {
    if (Object.keys(documentFiles).length === 0) return;
    
    setUploadingDocs(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [docType, file] of Object.entries(documentFiles)) {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('loan_id', id!);
      formData.append('document_type', docType);

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Failed to upload ${docType}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} document(s) uploaded successfully`);
      setDocumentFiles({});
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} document(s) failed to upload`);
    }

    setUploadingDocs(false);
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

  const updateLoan = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        method: 'PUT',
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
          case_type: form.caseType === 'new_car_purchase' ? 'Purchase' : 
                     form.caseType === 'used_car_purchase' ? 'Purchase' :
                     form.caseType === 'used_car_refinance' ? 'Refinance' : 
                     form.caseType === 'used_car_bt' ? 'BT' :
                     form.caseType === 'used_car_topup' ? 'Top-up' : (form.caseType || null),
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
          financier_name: assignmentForm.ledgerSelection || null,
          financier_branch_name: assignmentForm.selectedBranchName || null,
          financier_executive_name: assignmentForm.salesManagerName || null,
          financier_executive_mobile: assignmentForm.salesManagerMobile || null,
          financier_area_manager_name: assignmentForm.areaManagerName || null,
          financier_area_manager_mobile: assignmentForm.areaManagerMobile || null,
          assigned_to: assignmentForm.assignedTo ? Number(assignmentForm.assignedTo) : null,
          bouncing_last_3m: form.bouncingLast3m ? Number(form.bouncingLast3m) : null,
          bouncing_last_6m: form.bouncingLast6m ? Number(form.bouncingLast6m) : null,
          existing_loan_status: form.loanStatus || null,
          existing_loan_amount: form.existingLoanAmount ? Number(form.existingLoanAmount) : null,
          existing_tenure: form.existingTenure ? Number(form.existingTenure) : null,
          existing_emi: form.existingEmi ? Number(form.existingEmi) : null,
          no_of_emi_paid: form.noOfEmiPaid ? Number(form.noOfEmiPaid) : null,
          login_date: form.loginDate || null,
          sourcing_person_name: form.sourcingPersonName || null,
          remark: form.remark || null,
          status: form.fileStatus || 'submitted',
          created_by: user?.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to update loan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      toast.success('Loan updated successfully!');
      navigate('/loans');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update loan');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.mobile.trim() || !form.loanAmount) {
      toast.error('Customer Name, Mobile, and Loan Amount are required');
      return;
    }
    
    // First upload documents if any
    if (Object.keys(documentFiles).length > 0) {
      await uploadDocuments();
    }
    
    // Then update the loan
    updateLoan.mutate();
  };

  // Check if mandatory documents are uploaded (for executive and team_leader roles)
  const isExecutive = user?.role === 'executive';
  const isTeamLeader = user?.role === 'team_leader';
  const mandatoryDocTypes = ['aadharFront', 'aadharBack', 'panCard', 'rcFront', 'rcBack'];
  const mandatoryDocsUploaded = mandatoryDocTypes.every(docType => documentFiles[docType]);
  const showOtherDocs = (!isExecutive && !isTeamLeader) || mandatoryDocsUploaded;

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Loading loan details…</div>;
  }

  const inputClass = "w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
  const labelClass = "block text-[10px] font-medium text-foreground/70 mb-1";

  return (
    <div className="w-full max-w-full">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground mb-2">Edit Loan Application</h1>
        <p className="text-sm text-muted-foreground">Loan ID: {form.loanNumber}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-full">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm mb-4 space-y-6 w-full">
          {/* Customer Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Customer Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="floating-input-wrapper"><input className={inputClass} value={form.customerId} onChange={e => update('customerId', e.target.value)} placeholder=" " /><label className={labelClass}>Customer ID</label></div>
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
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantMobile} onChange={e => { const value = e.target.value.replace(/\D/g, ''); update('coApplicantMobile', value); }} maxLength={10} inputMode='numeric' placeholder=" " /><label className={labelClass}>Co-Applicant Mobile</label></div>
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
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorMobile} onChange={e => { const value = e.target.value.replace(/\D/g, ''); update('guarantorMobile', value); }} maxLength={10} inputMode='numeric' placeholder=" " /><label className={labelClass}>Guarantor Mobile</label></div>
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
                <div className="floating-input-wrapper"><input className={inputClass} value={form.ownershipType} onChange={e => update('ownershipType', e.target.value)} placeholder=" " /><label className={labelClass}>Ownership Type</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financer} onChange={e => update('financer', e.target.value)} placeholder=" " /><label className={labelClass}>Financer</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.financeStatus} onChange={e => update('financeStatus', e.target.value)} placeholder=" " /><label className={labelClass}>Finance Status</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.insuranceCompany} onChange={e => update('insuranceCompany', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Company</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.insuranceValidUpto} onChange={e => update('insuranceValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Valid Upto</label></div>
                <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.puccValidUpto} onChange={e => update('puccValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>PUCC Valid Upto</label></div>
                <div className="floating-input-wrapper"><input className={inputClass} value={form.caseType} onChange={e => update('caseType', e.target.value)} placeholder=" " /><label className={labelClass}>Case Type</label></div>
                <div className="floating-input-wrapper"><input required type="number" className={inputClass} value={form.loanAmount} onChange={e => update('loanAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Loan Amount (₹) *</label></div>
              </div>
            </div>

            

          {/* Income Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Income Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="floating-input-wrapper"><input className={inputClass} value={form.incomeSource} onChange={e => update('incomeSource', e.target.value)} placeholder=" " /><label className={labelClass}>Income Source</label></div>
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
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.salarySlipAvailable} onChange={e => update('salarySlipAvailable', e.target.value)} placeholder=" " /><label className={labelClass}>Salary Slip Available</label></div>
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
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.salaryCreditMode} onChange={e => update('salaryCreditMode', e.target.value)} placeholder=" " /><label className={labelClass}>Salary Credit Mode</label></div>
                  )}
                  {(form.salaryCreditMode || form.totalWorkExp) && (
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.itrAvailable} onChange={e => update('itrAvailable', e.target.value)} placeholder=" " /><label className={labelClass}>ITR Available</label></div>
                  )}
                  {form.itrAvailable === 'Yes' && (
                    <div className="floating-input-wrapper">
                      <input type="number" className={inputClass} value={form.annualIncomeItr} onChange={e => update('annualIncomeItr', e.target.value)} placeholder=" " max="999999" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 6) t.value = t.value.slice(0,6); }} />
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
                  <div className="floating-input-wrapper"><input className={inputClass} value={form.profile} onChange={e => update('profile', e.target.value)} placeholder=" " /><label className={labelClass}>Profile</label></div>

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
                          <div className="floating-input-wrapper"><input className={inputClass} value={form.professionalSubtype} onChange={e => update('professionalSubtype', e.target.value)} placeholder=" " /><label className={labelClass}>Professional Subtype</label></div>
                          {form.professionalSubtype && <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.practiceExperience} onChange={e => update('practiceExperience', e.target.value)} placeholder=" " max="99" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 2) t.value = t.value.slice(0,2); }} /><label className={labelClass}>Practice Experience (In Yrs)</label></div>}
                        </>
                      )}

                      {form.profile === 'Freelancer/Agent' && (
                        <div className="floating-input-wrapper"><input className={inputClass} value={form.freelancerSubtype} onChange={e => update('freelancerSubtype', e.target.value)} placeholder=" " /><label className={labelClass}>Subtype</label></div>
                      )}

                      {form.profile === 'Other Income' && (
                        <div className="floating-input-wrapper">
                          <input className={inputClass} value={form.otherIncomeType} onChange={e => update('otherIncomeType', e.target.value)} placeholder=" " />
                          <label className={labelClass}>Profession</label>
                        </div>
                      )}

                      {/* ITR always last */}
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.itrAvailable} onChange={e => update('itrAvailable', e.target.value)} placeholder=" " /><label className={labelClass}>ITR Available</label></div>
                      {form.itrAvailable === 'Yes' && (
                        <div className="floating-input-wrapper">
                          <input type="number" className={inputClass} value={form.annualIncomeItr} onChange={e => update('annualIncomeItr', e.target.value)} placeholder=" " max="999999" onInput={e => { const t = e.target as HTMLInputElement; if(t.value.length > 6) t.value = t.value.slice(0,6); }} />
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
                    {!documentFiles.aadharFront && <input type="file" className={inputClass} onChange={e => update('aadharFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    {documentFiles.aadharFront && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.aadharFront.name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Aadhar Card Back {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!documentFiles.aadharBack && <input type="file" className={inputClass} onChange={e => update('aadharBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    {documentFiles.aadharBack && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.aadharBack.name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Pan Card {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!documentFiles.panCard && <input type="file" className={inputClass} onChange={e => update('panCard', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    {documentFiles.panCard && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.panCard.name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Front) {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!documentFiles.rcFront && <input type="file" className={inputClass} onChange={e => update('rcFront', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    {documentFiles.rcFront && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.rcFront.name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>RC (Back) {(isExecutive || isTeamLeader) && <span className="text-red-500">*</span>}</label>
                    {!documentFiles.rcBack && <input type="file" className={inputClass} onChange={e => update('rcBack', e.target.files?.[0] || null)} accept="image/*,.pdf" required={isExecutive || isTeamLeader} />}
                    {documentFiles.rcBack && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.rcBack.name}</p>}
                  </div>
                </div>

                {/* Other Documents - Show only after mandatory docs are uploaded */}
                {showOtherDocs ? (
                  <>
                    {(isExecutive || isTeamLeader) && <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-300">✓ Mandatory documents uploaded. You can now upload additional documents.</div>}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Driving Licence</label>
                        {!documentFiles.drivingLicence && <input type="file" className={inputClass} onChange={e => update('drivingLicence', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.drivingLicence && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.drivingLicence.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Light Bill</label>
                        {!documentFiles.lightBill && <input type="file" className={inputClass} onChange={e => update('lightBill', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.lightBill && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.lightBill.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Last 6 Month Bank Statement</label>
                        {!documentFiles.bankStatement && <input type="file" className={inputClass} onChange={e => update('bankStatement', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.bankStatement && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.bankStatement.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Cheque</label>
                        {!documentFiles.cheque && <input type="file" className={inputClass} onChange={e => update('cheque', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.cheque && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.cheque.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Income Proof</label>
                        {!documentFiles.incomeProof && <input type="file" className={inputClass} onChange={e => update('incomeProof', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.incomeProof && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.incomeProof.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Rent Agreement</label>
                        {!documentFiles.rentAgreement && <input type="file" className={inputClass} onChange={e => update('rentAgreement', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.rentAgreement && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.rentAgreement.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Customer Photo</label>
                        {!documentFiles.customerPhoto && <input type="file" className={inputClass} onChange={e => update('customerPhoto', e.target.files?.[0] || null)} accept="image/*" />}
                        {documentFiles.customerPhoto && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.customerPhoto.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Disbursement Memo</label>
                        {!documentFiles.disbursementMemo && <input type="file" className={inputClass} onChange={e => update('disbursementMemo', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.disbursementMemo && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.disbursementMemo.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Insurance</label>
                        {!documentFiles.insurance && <input type="file" className={inputClass} onChange={e => update('insurance', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.insurance && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.insurance.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Customer Ledger</label>
                        {!documentFiles.customerLedger && <input type="file" className={inputClass} onChange={e => update('customerLedger', e.target.files?.[0] || null)} accept="image/*,.pdf" />}
                        {documentFiles.customerLedger && <p className="text-xs text-green-600 mt-1">✓ {documentFiles.customerLedger.name}</p>}
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

          {/* Assignment Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Assignment Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Lender */}
              <div className="floating-input-wrapper">
                <select 
                  className={inputClass}
                  value={assignmentForm.ledgerSelection}
                  onChange={e => handleLenderChange(e.target.value)}
                >
                  <option value="">Choose lender</option>
                  {lenders.map((lender) => (
                    <option key={lender} value={lender}>{lender}</option>
                  ))}
                </select>
                <label className={labelClass}>Select Lender</label>
              </div>

              {/* Branch dropdown — shown when branches exist */}
              {assignmentForm.ledgerSelection && assignmentForm.ledgerSelection !== 'Others' && (
                <div className="floating-input-wrapper">
                  <select
                    className={inputClass}
                    value={assignmentForm.selectedBranchId}
                    onChange={e => handleBranchChange(e.target.value)}
                    disabled={loadingBranches || branchOptions.length === 0}
                  >
                    <option value="">{branchOptions.length === 0 ? '— No branches added —' : '— Select branch —'}</option>
                    {branchOptions.map((b: any) => (
                      <option key={b.id} value={String(b.id)}>{b.branch_name}{b.location ? ` (${b.location})` : ''}</option>
                    ))}
                  </select>
                  <label className={labelClass}>Select Branch {loadingBranches && <span className="text-muted-foreground">(loading...)</span>}</label>
                </div>
              )}

              {/* Sales Manager */}
              {assignmentForm.salesManagerName && (
                <div className="floating-input-wrapper">
                  <input className={inputClass} value={assignmentForm.salesManagerName} readOnly placeholder=" " />
                  <label className={labelClass}>Sales Manager</label>
                </div>
              )}

              {/* Sales Manager Mobile */}
              {assignmentForm.salesManagerMobile && (
                <div className="floating-input-wrapper">
                  <input className={inputClass} value={assignmentForm.salesManagerMobile} readOnly placeholder=" " />
                  <label className={labelClass}>Sales Manager Mobile</label>
                </div>
              )}

              {/* Area Manager */}
              {assignmentForm.areaManagerName && (
                <div className="floating-input-wrapper">
                  <input className={inputClass} value={assignmentForm.areaManagerName} readOnly placeholder=" " />
                  <label className={labelClass}>Area Manager</label>
                </div>
              )}

              {/* Area Manager Mobile */}
              {assignmentForm.areaManagerMobile && (
                <div className="floating-input-wrapper">
                  <input className={inputClass} value={assignmentForm.areaManagerMobile} readOnly placeholder=" " />
                  <label className={labelClass}>Area Manager Mobile</label>
                </div>
              )}
              
              {/* Admin Assignment */}
              {user?.role === 'admin' && (
                <div className="floating-input-wrapper">
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
                  <label className={labelClass}>Assign To</label>
                </div>
              )}
              
              {/* Remarks */}
              <div className="col-span-2 md:col-span-3 floating-input-wrapper">
                <textarea 
                  className={inputClass}
                  rows={2}
                  value={assignmentForm.remarks}
                  onChange={e => setAssignmentForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder=" "
                />
                <label className={labelClass}>Assignment Remarks (Optional)</label>
              </div>
            </div>
          </div>

          {/* Other Details */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Other Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.loginDate} onChange={e => update('loginDate', e.target.value)} placeholder=" " /><label className={labelClass}>Login Date</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.sourcingPersonName} onChange={e => update('sourcingPersonName', e.target.value)} placeholder=" " /><label className={labelClass}>Sourcing Person</label></div>
              <div className="md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={3} value={form.remark} onChange={e => update('remark', e.target.value)} placeholder=" " /><label className={labelClass}>Remark</label></div>
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
              disabled={updateLoan.isPending || uploadingDocs}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
            >
              {updateLoan.isPending || uploadingDocs ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {uploadingDocs ? 'Uploading Documents...' : 'Updating...'}
                </span>
              ) : '✓ Update Application'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
