import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { CAR_MAKES, calculateEMI, formatCurrency } from '@/lib/mock-data';
import { FINANCIERS } from '@/lib/financiers';
import { ArrowLeft, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { FloatingLabelInput, FloatingLabelTextarea, FloatingLabelSelect } from '@/components/FloatingLabelInput';
import '@/styles/floating-labels.css';

export default function EditLoan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showExistingDetails, setShowExistingDetails] = useState(false);

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
    sameAsCurrentAddress: false,
    permanentAddress: '', permanentLandmark: '', permanentDistrict: '', permanentState: '', permanentPincode: '',
    // Loan & Vehicle Details
    loanNumber: '', purposeLoanAmount: '', loanAmount: '', ltv: '', loanTypeVehicle: '',
    vehicleNumber: '', engineNumber: '', chassisNumber: '', ownerName: '', makerName: '',
    makerModel: '', modelVariantName: '', fuelType: '', manufacturingDate: '',
    ownershipType: '', financer: '', financeStatus: '', insuranceCompany: '', insuranceValidUpto: '',
    puccValidUpto: '', mfgYear: '', vertical: '', scheme: '', caseType: '',
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
    // Documents
    aadharFront: null, aadharBack: null, panCard: null, drivingLicence: null, lightBill: null,
    bankStatement: null, cheque: null, rcFront: null, rcBack: null, incomeProof: null,
    rentAgreement: null, customerPhoto: null, disbursementMemo: null, insurance: null, customerLedger: null,
    coAadharFront: null, coAadharBack: null, coPanCard: null, coPhoto: null,
    guarantorAadharFront: null, guarantorAadharBack: null, guarantorPanCard: null,
    guarantorRcFront: null, guarantorRcBack: null, guarantorPhoto: null,
  });

  // Populate form when loan data is loaded
  useEffect(() => {
    if (loanData) {
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
        permanentAddress: loanData.permanent_address || '',
        permanentLandmark: loanData.permanent_landmark || '',
        permanentDistrict: loanData.permanent_district || '',
        permanentState: loanData.permanent_state || '',
        permanentPincode: loanData.permanent_pincode || '',
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
        mfgYear: loanData.mfg_year || '',
        vertical: loanData.vertical || '',
        scheme: loanData.scheme || '',
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
        rcOwnerName: loanData.rc_owner_name || '',
        rcMfgDate: loanData.rc_mfg_date ? loanData.rc_mfg_date.split('T')[0] : '',
        rcExpiryDate: loanData.rc_expiry_date ? loanData.rc_expiry_date.split('T')[0] : '',
        hpnAtLogin: loanData.hpn_at_login || '',
        isFinanced: loanData.is_financed || '',
        newFinancier: loanData.new_financier || '',
        rtoDocsHandoverDate: loanData.rto_docs_handover_date ? loanData.rto_docs_handover_date.split('T')[0] : '',
        rtoAgentName: loanData.rto_agent_name || '',
        agentMobileNo: loanData.agent_mobile_no || '',
        dtoLocation: loanData.dto_location || '',
        rtoWorkDescription: loanData.rto_work_description || '',
        challan: loanData.challan || 'No',
        fc: loanData.fc || 'No',
        rtoPapers: loanData.rto_papers || '',
        rtoRC: loanData.rto_rc || false,
        rtoNOC: loanData.rto_noc || false,
        rtoPermit: loanData.rto_permit || false,
        rtoPollution: loanData.rto_pollution || false,
        rto2930Form: loanData.rto_2930_form || false,
        rtoSellAgreement: loanData.rto_sell_agreement || false,
        rtoRCOwnerKYC: loanData.rto_rc_owner_kyc || false,
        rtoStampPapers: loanData.rto_stamp_papers || false,
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
        financierExecutiveName: loanData.financier_executive_name || '',
        financierTeamVertical: loanData.financier_team_vertical || '',
        disburseBranchName: loanData.disburse_branch_name || '',
        sanctionAmount: loanData.sanction_amount?.toString() || '',
        sanctionDate: loanData.sanction_date || '',
        insuranceCompanyName: loanData.insurance_company_name || '',
        premiumAmount: loanData.premium_amount?.toString() || '',
        insuranceDate: loanData.insurance_date || '',
        insurancePolicyNumber: loanData.insurance_policy_number || '',
        processingFee: loanData.processing_fee?.toString() || '',
        totalDeduction: loanData.total_deduction?.toString() || '',
        netDisbursementAmount: loanData.net_disbursement_amount?.toString() || '',
        paymentReceivedDate: loanData.payment_received_date || '',
        appStage: loanData.app_stage || 'submitted',
        appScore: loanData.app_score || '',
        creditScore: loanData.credit_score || '',
        tags: loanData.tags || '',
        rejectedRemarks: loanData.rejected_remarks || '',
        approvedLoanAmount: loanData.approved_loan_amount?.toString() || '',
        approvedRoi: loanData.approved_roi?.toString() || '',
        approvedTenure: loanData.approved_tenure?.toString() || '',
        disbursedLoanAmount: loanData.disbursed_loan_amount?.toString() || '',
        disbursedRoi: loanData.disbursed_roi?.toString() || '',
        disbursedTenure: loanData.disbursed_tenure?.toString() || '',
        loanAccountNumber: loanData.loan_account_number || '',
        rcStatus: loanData.rc_status || '',
        rcType: loanData.rc_type || '',
        rcCollectedBy: loanData.rc_collected_by || '',
        rtoAgentNameStage: loanData.rto_agent_name_stage || '',
        rtoAgentMobileStage: loanData.rto_agent_mobile_stage || '',
        bankerName: loanData.banker_name || '',
        bankerMobile: loanData.banker_mobile || '',
        cancelledRemarks: loanData.cancelled_remarks || '',
        loginDate: loanData.login_date || '',
        approvalDate: loanData.approval_date || '',
        sourcingPersonName: loanData.sourcing_person_name || '',
        remark: loanData.remark || '',
        fileStatus: loanData.status || 'submitted',
      });
    }
  }, [loanData]);

  const update = (key: string, val: string | File | null) => setForm(f => ({ ...f, [key]: val }));

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
          current_district: form.currentDistrict || null,
          current_state: form.currentState || null,
          current_pincode: form.currentPincode || null,
          permanent_address: form.permanentAddress || null,
          permanent_landmark: form.permanentLandmark || null,
          permanent_district: form.permanentDistrict || null,
          permanent_state: form.permanentState || null,
          permanent_pincode: form.permanentPincode || null,
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
          mfg_year: form.mfgYear || null,
          vertical: form.vertical || null,
          scheme: form.scheme || null,
          case_type: form.caseType || null,
          financier_name: form.financierName === 'Others' ? form.otherFinancierName : form.financierName || null,
          financier_location: form.financierLocation || null,
          rc_owner_name: form.rcOwnerName || null,
          rc_mfg_date: form.rcMfgDate || null,
          rc_expiry_date: form.rcExpiryDate || null,
          hpn_at_login: form.hpnAtLogin || null,
          is_financed: form.isFinanced || null,
          new_financier: form.newFinancier || null,
          rto_docs_handover_date: form.rtoDocsHandoverDate || null,
          rto_agent_name: form.rtoAgentName || null,
          agent_mobile_no: form.agentMobileNo || null,
          dto_location: form.dtoLocation || null,
          rto_work_description: form.rtoWorkDescription || null,
          challan: form.challan || 'No',
          fc: form.fc || 'No',
          rto_papers: form.rtoPapers || null,
          rto_rc: form.rtoRC || false,
          rto_noc: form.rtoNOC || false,
          rto_permit: form.rtoPermit || false,
          rto_pollution: form.rtoPollution || false,
          rto_2930_form: form.rto2930Form || false,
          rto_sell_agreement: form.rtoSellAgreement || false,
          rto_rc_owner_kyc: form.rtoRCOwnerKYC || false,
          rto_stamp_papers: form.rtoStampPapers || false,
          bouncing_last_3m: form.bouncingLast3m ? Number(form.bouncingLast3m) : null,
          bouncing_last_6m: form.bouncingLast6m ? Number(form.bouncingLast6m) : null,
          existing_loan_status: form.loanStatus || null,
          existing_loan_amount: form.existingLoanAmount ? Number(form.existingLoanAmount) : null,
          existing_tenure: form.existingTenure ? Number(form.existingTenure) : null,
          existing_emi: form.existingEmi ? Number(form.existingEmi) : null,
          no_of_emi_paid: form.noOfEmiPaid ? Number(form.noOfEmiPaid) : null,
          emi_amount: emi || null,
          total_emi: Number(form.tenure) || null,
          total_interest: (totalInterest > 0 ? totalInterest : null),
          irr: Number(form.irr) || null,
          tenure: Number(form.tenure) || 60,
          emi_mode: form.emiMode || 'Monthly',
          emi_start_date: form.emiStartDate || null,
          emi_end_date: form.emiEndDate || null,
          processing_fee: Number(form.processingFee) || null,
          emi: emi || null,
          interest_rate: Number(form.irr) || null,
          assigned_bank_id: form.assignedBankId || null,
          assigned_broker_id: form.assignedBrokerId || null,
          financier_executive_name: form.financierExecutiveName || null,
          financier_team_vertical: form.financierTeamVertical || null,
          disburse_branch_name: form.disburseBranchName || null,
          sanction_amount: Number(form.sanctionAmount) || null,
          sanction_date: form.sanctionDate || null,
          insurance_company_name: form.insuranceCompanyName || null,
          premium_amount: Number(form.premiumAmount) || null,
          insurance_date: form.insuranceDate || null,
          insurance_policy_number: form.insurancePolicyNumber || null,
          total_deduction: Number(form.totalDeduction) || null,
          net_disbursement_amount: Number(form.netDisbursementAmount) || null,
          payment_received_date: form.paymentReceivedDate || null,
          app_stage: form.appStage || null,
          app_score: form.appScore || null,
          credit_score: form.creditScore || null,
          tags: form.tags || null,
          rejected_remarks: form.rejectedRemarks || null,
          approved_loan_amount: Number(form.approvedLoanAmount) || null,
          approved_roi: Number(form.approvedRoi) || null,
          approved_tenure: Number(form.approvedTenure) || null,
          disbursed_loan_amount: Number(form.disbursedLoanAmount) || null,
          disbursed_roi: Number(form.disbursedRoi) || null,
          disbursed_tenure: Number(form.disbursedTenure) || null,
          loan_account_number: form.loanAccountNumber || null,
          rc_status: form.rcStatus || null,
          rc_type: form.rcType || null,
          rc_collected_by: form.rcCollectedBy || null,
          rto_agent_name_stage: form.rtoAgentNameStage || null,
          rto_agent_mobile_stage: form.rtoAgentMobileStage || null,
          banker_name: form.bankerName || null,
          banker_mobile: form.bankerMobile || null,
          cancelled_remarks: form.cancelledRemarks || null,
          login_date: form.loginDate || null,
          approval_date: form.approvalDate || null,
          sourcing_person_name: form.sourcingPersonName || null,
          remark: form.remark || null,
          status: form.fileStatus || 'submitted',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.mobile.trim() || !form.loanAmount) {
      toast.error('Customer Name, Mobile, and Loan Amount are required');
      return;
    }

    if (form.appStage === 'login' && (!form.appScore || !form.creditScore)) {
      return toast.error('App Score and Credit Score are required for Login stage');
    }
    if (form.appStage === 'in_process' && !form.tags) {
      return toast.error('Tags are required for In Process stage');
    }
    if (form.appStage === 'approved' && (!form.approvedLoanAmount || !form.approvedRoi || !form.approvedTenure)) {
      return toast.error('Approved amount, ROI, and tenure are required for Approved stage');
    }
    if (form.appStage === 'disbursed' && (!form.disbursedLoanAmount || !form.disbursedRoi || !form.disbursedTenure || !form.loanAccountNumber || !form.rcStatus)) {
      return toast.error('All disbursement details (Amount, ROI, Tenure, LAN, RC Info) are required for Disbursed stage');
    }

    updateLoan.mutate();
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Loading loan details…</div>;
  }

  const inputClass = "w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all";
  const labelClass = "block text-[10px] font-medium text-foreground/70 mb-1";

  return (
    <div className="w-full mx-auto px-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground mb-2">Edit Loan Application</h1>
        <p className="text-sm text-muted-foreground">Loan ID: {form.loanNumber}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Customer Details */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">Customer Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper"><input className={inputClass} value={form.customerId} onChange={e => update('customerId', e.target.value)} placeholder=" " /><label className={labelClass}>Customer ID</label></div>
              <div className="floating-input-wrapper"><input required className={inputClass} value={form.customerName} onChange={e => update('customerName', e.target.value)} placeholder=" " /><label className={labelClass}>Customer Name *</label></div>
              <div className="floating-input-wrapper"><input required className={inputClass} value={form.mobile} onChange={e => update('mobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Mobile No *</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantName} onChange={e => update('coApplicantName', e.target.value)} placeholder=" " /><label className={labelClass}>Co-Applicant Name</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.coApplicantMobile} onChange={e => update('coApplicantMobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Co-Applicant Mobile</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorName} onChange={e => update('guarantorName', e.target.value)} placeholder=" " /><label className={labelClass}>Guarantor Name</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.guarantorMobile} onChange={e => update('guarantorMobile', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Guarantor Mobile</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.ourBranch} onChange={e => update('ourBranch', e.target.value)} placeholder=" " /><label className={labelClass}>Our Branch</label></div>
              <div className="md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={2} value={form.currentAddress} onChange={e => update('currentAddress', e.target.value)} placeholder=" " /><label className={labelClass}>Current Address</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.currentLandmark} onChange={e => update('currentLandmark', e.target.value)} placeholder=" " /><label className={labelClass}>Landmark</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.currentDistrict} onChange={e => update('currentDistrict', e.target.value)} placeholder=" " /><label className={labelClass}>District</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.currentState} onChange={e => update('currentState', e.target.value)} placeholder=" " /><label className={labelClass}>State</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.currentPincode} onChange={e => update('currentPincode', e.target.value)} maxLength={6} placeholder=" " /><label className={labelClass}>Pincode</label></div>
              <div className="md:col-span-3 floating-input-wrapper">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.sameAsCurrentAddress} onChange={e => {
                    update('sameAsCurrentAddress', e.target.checked);
                    if (e.target.checked) {
                      setForm(f => ({
                        ...f,
                        permanentAddress: f.currentAddress,
                        permanentLandmark: f.currentLandmark,
                        permanentDistrict: f.currentDistrict,
                        permanentState: f.currentState,
                        permanentPincode: f.currentPincode,
                      }));
                    }
                  }} className="rounded" />
                  <span className="text-xs font-medium">Permanent Address Same As Current</span>
                </label>
              </div>
              {!form.sameAsCurrentAddress && (
                <>
                  <div className="md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={2} value={form.permanentAddress} onChange={e => update('permanentAddress', e.target.value)} placeholder=" " /><label className={labelClass}>Permanent Address</label></div>
                  <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentLandmark} onChange={e => update('permanentLandmark', e.target.value)} placeholder=" " /><label className={labelClass}>Landmark</label></div>
                  <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentDistrict} onChange={e => update('permanentDistrict', e.target.value)} placeholder=" " /><label className={labelClass}>District</label></div>
                  <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentState} onChange={e => update('permanentState', e.target.value)} placeholder=" " /><label className={labelClass}>State</label></div>
                  <div className="floating-input-wrapper"><input className={inputClass} value={form.permanentPincode} onChange={e => update('permanentPincode', e.target.value)} maxLength={6} placeholder=" " /><label className={labelClass}>Pincode</label></div>
                </>
              )}
            </div>
          </div>

          {/* Vehicle & Loan Details */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">Vehicle & Loan Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper"><input className={inputClass} value={form.vehicleNumber} onChange={e => update('vehicleNumber', e.target.value.toUpperCase())} placeholder=" " /><label className={labelClass}>Vehicle Reg. No</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.engineNumber} onChange={e => update('engineNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Engine Number</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.chassisNumber} onChange={e => update('chassisNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Chassis Number</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder=" " /><label className={labelClass}>Owner Name</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.makerName} onChange={e => update('makerName', e.target.value)} placeholder=" " /><label className={labelClass}>Maker's Name</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.makerModel} onChange={e => update('makerModel', e.target.value)} placeholder=" " /><label className={labelClass}>Maker Model</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.modelVariantName} onChange={e => update('modelVariantName', e.target.value)} placeholder=" " /><label className={labelClass}>Model / Variant</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.mfgYear} onChange={e => update('mfgYear', e.target.value)} min="2000" max="2030" placeholder=" " /><label className={labelClass}>Mfg Year</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.manufacturingDate} onChange={e => update('manufacturingDate', e.target.value)} placeholder=" " /><label className={labelClass}>Manufacturing Date</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.fuelType} onChange={e => update('fuelType', e.target.value)}><option value="">Select Fuel Type</option><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option><option value="CNG">CNG</option><option value="Hybrid">Hybrid</option><option value="Electric">Electric</option></select><label className={labelClass}>Fuel Type</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.ownershipType} onChange={e => update('ownershipType', e.target.value)}><option value="">Select Type</option><option value="First Owner">First Owner</option><option value="Second Owner">Second Owner</option><option value="Third Owner">Third Owner</option><option value="Fourth Owner">Fourth Owner</option></select><label className={labelClass}>Ownership Type</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.financer} onChange={e => update('financer', e.target.value)} placeholder=" " /><label className={labelClass}>Financier (from RC)</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.financeStatus} onChange={e => update('financeStatus', e.target.value)}><option value="">Select</option><option value="Financed">Financed</option><option value="Not Financed">Not Financed</option></select><label className={labelClass}>Finance Status</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.insuranceCompany} onChange={e => update('insuranceCompany', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Company</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.insuranceValidUpto} onChange={e => update('insuranceValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Valid Upto</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.puccValidUpto} onChange={e => update('puccValidUpto', e.target.value)} placeholder=" " /><label className={labelClass}>PUCC Valid Upto</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.vertical} onChange={e => update('vertical', e.target.value)}><option value="">Select</option><option value="LCV">LCV</option><option value="HCV">HCV</option><option value="PV (Car)">PV (Car)</option><option value="CV">CV</option><option value="Tractor">Tractor</option></select><label className={labelClass}>Vertical</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.scheme} onChange={e => update('scheme', e.target.value)}><option value="">Select</option><option value="Re-finance">Re-finance</option><option value="New Finance">New Finance</option><option value="Balance Transfer">Balance Transfer</option><option value="Purchase">Purchase</option><option value="Purchase+BT">Purchase+BT</option><option value="SVSH">SVSH</option><option value="SVOH">SVOH</option></select><label className={labelClass}>Scheme</label></div>
                    <div className="floating-input-wrapper"><input required type="number" className={inputClass} value={form.loanAmount} onChange={e => update('loanAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Loan Amount (₹) *</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.ltv} onChange={e => update('ltv', e.target.value)} placeholder=" " /><label className={labelClass}>LTV (%)</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.loanTypeVehicle} onChange={e => update('loanTypeVehicle', e.target.value)}><option value="">Select</option><option value="New Vehicle Loan">New Vehicle Loan</option><option value="Used Vehicle Loan">Used Vehicle Loan</option></select><label className={labelClass}>Loan Type</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.caseType} onChange={e => update('caseType', e.target.value)} placeholder=" " /><label className={labelClass}>Case Type</label></div>
            </div>
          </div>

          {/* EMI & Financier Details */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">EMI & Financier Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper"><input type="number" step="0.01" className={inputClass} value={form.irr} onChange={e => update('irr', e.target.value)} placeholder=" " /><label className={labelClass}>IRR (%)</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.tenure} onChange={e => update('tenure', e.target.value)}>{[12, 18, 24, 36, 48, 60, 72, 84].map(t => <option key={t} value={t}>{t} MONTH</option>)}</select><label className={labelClass}>Tenure</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.emiMode} onChange={e => update('emiMode', e.target.value)}><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Semi-Annual">Semi-Annual</option><option value="Annual">Annual</option></select><label className={labelClass}>EMI Mode</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.emiStartDate} onChange={e => update('emiStartDate', e.target.value)} placeholder=" " /><label className={labelClass}>EMI Start Date</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.emiEndDate} onChange={e => update('emiEndDate', e.target.value)} placeholder=" " /><label className={labelClass}>EMI End Date</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.processingFee} onChange={e => update('processingFee', e.target.value)} placeholder=" " /><label className={labelClass}>Processing Fee (₹)</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.assignedBankId} onChange={e => update('assignedBankId', e.target.value)}><option value="">Select Financier Name</option>{(banks as any[]).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><label className={labelClass}>Financier Name</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.assignedBrokerId} onChange={e => update('assignedBrokerId', e.target.value)}><option value="">Select Broker (Optional)</option>{(brokers as any[]).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><label className={labelClass}>Broker</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.financierExecutiveName} onChange={e => update('financierExecutiveName', e.target.value)} placeholder=" " /><label className={labelClass}>Financier Executive Name</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.financierTeamVertical} onChange={e => update('financierTeamVertical', e.target.value)} placeholder=" " /><label className={labelClass}>Team Vertical</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.disburseBranchName} onChange={e => update('disburseBranchName', e.target.value)} placeholder=" " /><label className={labelClass}>Disburse Branch Name</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.sanctionAmount} onChange={e => update('sanctionAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Sanction Amount (₹)</label></div>
              <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.sanctionDate} onChange={e => update('sanctionDate', e.target.value)} placeholder=" " /><label className={labelClass}>Sanction Date</label></div>
            </div>
            {emi > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
                <div className="flex items-center gap-2 mb-3"><Calculator size={16} className="text-accent" /><span className="text-accent font-semibold text-sm">EMI Calculator</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-background/50"><p className="text-xs text-muted-foreground mb-1">Monthly EMI</p><p className="text-lg font-bold text-accent break-all">{formatCurrency(emi)}</p></div>
                  <div className="text-center p-3 rounded-lg bg-background/50"><p className="text-xs text-muted-foreground mb-1">Total Interest</p><p className="text-lg font-bold text-foreground break-all">{formatCurrency(totalInterest > 0 ? totalInterest : 0)}</p></div>
                  <div className="text-center p-3 rounded-lg bg-background/50"><p className="text-xs text-muted-foreground mb-1">Total Payable</p><p className="text-lg font-bold text-foreground break-all">{formatCurrency(totalPayable)}</p></div>
                </div>
              </div>
            )}
          </div>

          {/* Existing Loan Details */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">Existing Loan & EMI Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper"><select className={inputClass} value={form.loanStatus} onChange={e => update('loanStatus', e.target.value)}><option value="">Select</option><option value="Active">Active</option><option value="Closed">Closed</option><option value="Default">Default</option></select><label className={labelClass}>Loan Status</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.existingLoanAmount} onChange={e => update('existingLoanAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Loan Amount</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.existingTenure} onChange={e => update('existingTenure', e.target.value)} placeholder=" " /><label className={labelClass}>Tenure (Months)</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.existingEmi} onChange={e => update('existingEmi', e.target.value)} placeholder=" " /><label className={labelClass}>EMI Amount</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.noOfEmiPaid} onChange={e => update('noOfEmiPaid', e.target.value)} placeholder=" " /><label className={labelClass}>No of EMI Paid</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.bouncingLast3m} onChange={e => update('bouncingLast3m', e.target.value)} placeholder=" " /><label className={labelClass}>Bouncing in 3 Months</label></div>
              <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.bouncingLast6m} onChange={e => update('bouncingLast6m', e.target.value)} placeholder=" " /><label className={labelClass}>Bouncing in 6 Months</label></div>
            </div>
          </div>

          {/* Insurance & RTO Details */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">Insurance & RTO Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper"><input className={inputClass} value={form.insuranceCompanyName} onChange={e => update('insuranceCompanyName', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Company</label></div>
                    <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.premiumAmount} onChange={e => update('premiumAmount', e.target.value)} placeholder=" " /><label className={labelClass}>Premium Amount (₹)</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.insuranceDate} onChange={e => update('insuranceDate', e.target.value)} placeholder=" " /><label className={labelClass}>Insurance Expiry Date</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.insurancePolicyNumber} onChange={e => update('insurancePolicyNumber', e.target.value)} placeholder=" " /><label className={labelClass}>Policy Number</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.rcOwnerName} onChange={e => update('rcOwnerName', e.target.value)} placeholder=" " /><label className={labelClass}>RC Owner Name</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.rcMfgDate} onChange={e => update('rcMfgDate', e.target.value)} placeholder=" " /><label className={labelClass}>RC Mfg Date</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.rcExpiryDate} onChange={e => update('rcExpiryDate', e.target.value)} placeholder=" " /><label className={labelClass}>RC Expiry Date</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.hpnAtLogin} onChange={e => update('hpnAtLogin', e.target.value)} placeholder=" " /><label className={labelClass}>HPN at Login</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.isFinanced} onChange={e => update('isFinanced', e.target.value)} placeholder=" " /><label className={labelClass}>Is Financed</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.newFinancier} onChange={e => update('newFinancier', e.target.value)} placeholder=" " /><label className={labelClass}>New Financier</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.rtoDocsHandoverDate} onChange={e => update('rtoDocsHandoverDate', e.target.value)} placeholder=" " /><label className={labelClass}>RTO Docs Handover Date</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.rtoAgentName} onChange={e => update('rtoAgentName', e.target.value)} placeholder=" " /><label className={labelClass}>RTO Agent Name</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.agentMobileNo} onChange={e => update('agentMobileNo', e.target.value)} maxLength={10} placeholder=" " /><label className={labelClass}>Agent Mobile</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.dtoLocation} onChange={e => update('dtoLocation', e.target.value)} placeholder=" " /><label className={labelClass}>DTO Location</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.rtoWorkDescription} onChange={e => update('rtoWorkDescription', e.target.value)} placeholder=" " /><label className={labelClass}>RTO Work Description</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.challan} onChange={e => update('challan', e.target.value)}><option value="No">No</option><option value="Yes">Yes</option></select><label className={labelClass}>Challan</label></div>
                    <div className="floating-input-wrapper"><select className={inputClass} value={form.fc} onChange={e => update('fc', e.target.value)}><option value="No">No</option><option value="Yes">Yes</option></select><label className={labelClass}>FC</label></div>
              <div className="floating-input-wrapper"><input className={inputClass} value={form.rtoPapers} onChange={e => update('rtoPapers', e.target.value)} placeholder=" " /><label className={labelClass}>RTO Papers</label></div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-muted">
              <h4 className="text-xs font-semibold text-foreground mb-3">RTO Papers Checklist</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.rtoRC} onChange={e => update('rtoRC', e.target.checked)} className="rounded" /><span className="text-xs">RC</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.rtoNOC} onChange={e => update('rtoNOC', e.target.checked)} className="rounded" /><span className="text-xs">NOC</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.rtoPermit} onChange={e => update('rtoPermit', e.target.checked)} className="rounded" /><span className="text-xs">Permit</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.rtoPollution} onChange={e => update('rtoPollution', e.target.checked)} className="rounded" /><span className="text-xs">Pollution</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.rto2930Form} onChange={e => update('rto2930Form', e.target.checked)} className="rounded" /><span className="text-xs">2930 Form</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.rtoSellAgreement} onChange={e => update('rtoSellAgreement', e.target.checked)} className="rounded" /><span className="text-xs">Sell Agreement</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.rtoRCOwnerKYC} onChange={e => update('rtoRCOwnerKYC', e.target.checked)} className="rounded" /><span className="text-xs">RC Owner KYC</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.rtoStampPapers} onChange={e => update('rtoStampPapers', e.target.checked)} className="rounded" /><span className="text-xs">Stamp Papers</span></label>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className={labelClass}>Aadhar Card Front</label><input type="file" className={inputClass} onChange={e => update('aadharFront', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>Aadhar Card Back</label><input type="file" className={inputClass} onChange={e => update('aadharBack', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>Pan Card</label><input type="file" className={inputClass} onChange={e => update('panCard', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>RC (Front)</label><input type="file" className={inputClass} onChange={e => update('rcFront', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>RC (Back)</label><input type="file" className={inputClass} onChange={e => update('rcBack', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>Driving Licence</label><input type="file" className={inputClass} onChange={e => update('drivingLicence', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>Light Bill</label><input type="file" className={inputClass} onChange={e => update('lightBill', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>Bank Statement</label><input type="file" className={inputClass} onChange={e => update('bankStatement', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>Cheque</label><input type="file" className={inputClass} onChange={e => update('cheque', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>Income Proof</label><input type="file" className={inputClass} onChange={e => update('incomeProof', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
                    <div><label className={labelClass}>Customer Photo</label><input type="file" className={inputClass} onChange={e => update('customerPhoto', e.target.files?.[0] || null)} accept="image/*" /></div>
              <div><label className={labelClass}>Customer Ledger</label><input type="file" className={inputClass} onChange={e => update('customerLedger', e.target.files?.[0] || null)} accept="image/*,.pdf" /></div>
            </div>
          </div>

          {/* Other Details */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">Other Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.loginDate} onChange={e => update('loginDate', e.target.value)} placeholder=" " /><label className={labelClass}>Login Date</label></div>
                    <div className="floating-input-wrapper"><input type="date" className={inputClass} value={form.approvalDate} onChange={e => update('approvalDate', e.target.value)} placeholder=" " /><label className={labelClass}>Approval Date</label></div>
                    <div className="floating-input-wrapper"><input className={inputClass} value={form.sourcingPersonName} onChange={e => update('sourcingPersonName', e.target.value)} placeholder=" " /><label className={labelClass}>Sourcing Person</label></div>
              <div className="md:col-span-3 floating-input-wrapper"><textarea className={inputClass} rows={3} value={form.remark} onChange={e => update('remark', e.target.value)} placeholder=" " /><label className={labelClass}>Remark</label></div>
            </div>
          </div>

          {/* Income Details - Separate Box */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">Income Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="floating-input-wrapper">
                <select className={inputClass} value={form.incomeSource} onChange={e => update('incomeSource', e.target.value)}>
                  <option value="">Select Income Source</option>
                  <option value="Salaried">Salaried</option>
                  <option value="Self Employed">Self Employed</option>
                  <option value="Farmer">Farmer</option>
                  <option value="Freelancer/Agent">Freelancer/Agent</option>
                  <option value="Other Income">Other Income</option>
                </select>
                <label className={labelClass}>Income Source</label>
              </div>
              <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.monthlyIncome} onChange={e => update('monthlyIncome', e.target.value)} placeholder=" " /><label className={labelClass}>Monthly Income (₹)</label></div>
              <div className="floating-input-wrapper">
                <select className={inputClass} value={form.financierName} onChange={e => update('financierName', e.target.value)}>
                  <option value="">Select Financier</option>
                  {FINANCIERS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <label className={labelClass}>Financier Name</label>
              </div>
              {form.financierName === 'Others' && (
                <div className="floating-input-wrapper">
                  <input className={inputClass} value={form.otherFinancierName} onChange={e => update('otherFinancierName', e.target.value)} placeholder=" " />
                  <label className={labelClass}>Enter Financier Name</label>
                </div>
              )}
            </div>

            {/* Salaried Income Fields */}
            {form.incomeSource === 'Salaried' && (
              <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-muted">
                <h3 className="text-sm font-semibold text-foreground mb-3">Salaried Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="floating-input-wrapper"><input className={inputClass} value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder=" " /><label className={labelClass}>Company Name</label></div>
                  <div className="floating-input-wrapper"><input className={inputClass} value={form.designation} onChange={e => update('designation', e.target.value)} placeholder=" " /><label className={labelClass}>Designation</label></div>
                  <div className="floating-input-wrapper"><input className={inputClass} value={form.workExperience} onChange={e => update('workExperience', e.target.value)} placeholder=" " /><label className={labelClass}>Work Experience</label></div>
                  <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.currentJobYears} onChange={e => update('currentJobYears', e.target.value)} placeholder=" " /><label className={labelClass}>Current Job (In Yrs)</label></div>
                  <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.totalWorkExp} onChange={e => update('totalWorkExp', e.target.value)} placeholder=" " /><label className={labelClass}>Total Work Exp. (In Yrs)</label></div>
                  <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.netMonthlySalary} onChange={e => update('netMonthlySalary', e.target.value)} placeholder=" " /><label className={labelClass}>Net Monthly Salary</label></div>
                  <div className="floating-input-wrapper">
                    <select className={inputClass} value={form.salaryCreditMode} onChange={e => update('salaryCreditMode', e.target.value)}>
                      <option value="">Select Mode</option>
                      <option value="Account Transfer">Account Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                    <label className={labelClass}>Salary Credit Mode</label>
                  </div>
                  <div className="floating-input-wrapper">
                    <select className={inputClass} value={form.salarySlipAvailable} onChange={e => update('salarySlipAvailable', e.target.value)}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    <label className={labelClass}>Salary Slip Available</label>
                  </div>
                </div>
              </div>
            )}

            {/* Self Employed Fields */}
            {form.incomeSource === 'Self Employed' && (
              <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-muted">
                <h3 className="text-sm font-semibold text-foreground mb-3">Self Employed Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

                  {form.profile === 'Business' && (
                    <>
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder=" " /><label className={labelClass}>Business Name</label></div>
                      <div className="floating-input-wrapper"><input className={inputClass} value={form.businessType} onChange={e => update('businessType', e.target.value)} placeholder=" " /><label className={labelClass}>Business Type</label></div>
                      <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.businessVintage} onChange={e => update('businessVintage', e.target.value)} placeholder=" " /><label className={labelClass}>Business Vintage (Years)</label></div>
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
                      <div className="floating-input-wrapper"><input type="number" className={inputClass} value={form.practiceExperience} onChange={e => update('practiceExperience', e.target.value)} placeholder=" " /><label className={labelClass}>Practice Experience (In Yrs)</label></div>
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
                      <select className={inputClass} value={form.otherIncomeType} onChange={e => update('otherIncomeType', e.target.value)}>
                        <option value="">Select Type</option>
                        <option value="Dairy">Dairy</option>
                        <option value="Rental">Rental</option>
                      </select>
                      <label className={labelClass}>Other Income Type</label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Freelancer/Agent Fields */}
            {form.incomeSource === 'Freelancer/Agent' && (
              <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-muted">
                <h3 className="text-sm font-semibold text-foreground mb-3">Freelancer/Agent Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                </div>
              </div>
            )}
          </div>

          {/* Application Stages - Separate Box */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-3">Application Stages</h2>

            {/* Stage Selection */}
            <div className="mb-4">
              <div className="floating-input-wrapper">
                <select className={inputClass} value={form.appStage} onChange={e => update('appStage', e.target.value)}>
                  <option value="submitted">Submitted</option>
                  <option value="login">Login</option>
                  <option value="in_process">In Process</option>
                  <option value="rejected">Rejected</option>
                  <option value="approved">Approved</option>
                  <option value="disbursed">Disbursed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <label className={labelClass}>Current Stage</label>
              </div>
            </div>

            {/* Login Stage Fields */}
            {form.appStage === 'login' && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">Login Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="floating-input-wrapper">
                    <input required type="number" min="0" max="1000" className={inputClass} value={form.appScore} onChange={e => update('appScore', e.target.value)} placeholder=" " />
                    <label className={labelClass}>App Score (0-1000) *</label>
                  </div>
                  <div className="floating-input-wrapper">
                    <input required type="number" min="300" max="900" className={inputClass} value={form.creditScore} onChange={e => update('creditScore', e.target.value)} placeholder=" " />
                    <label className={labelClass}>Credit Score (300-900) *</label>
                  </div>
                </div>
              </div>
            )}

            {/* In Process Stage Fields */}
            {form.appStage === 'in_process' && (
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-3">In Process Details</h3>
                <div className="floating-input-wrapper">
                  <input className={inputClass} value={form.tags} onChange={e => update('tags', e.target.value)} placeholder=" " />
                  <label className={labelClass}>Add Tags</label>
                </div>
              </div>
            )}

            {/* Rejected Stage Fields */}
            {form.appStage === 'rejected' && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">Rejection Details</h3>
                <div className="floating-input-wrapper">
                  <textarea className={inputClass} rows={3} value={form.rejectedRemarks} onChange={e => update('rejectedRemarks', e.target.value)} placeholder=" " />
                  <label className={labelClass}>Remarks</label>
                </div>
              </div>
            )}

            {/* Approved Stage Fields */}
            {form.appStage === 'approved' && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">Approval Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="floating-input-wrapper">
                    <input type="number" className={inputClass} value={form.approvedLoanAmount} onChange={e => update('approvedLoanAmount', e.target.value)} placeholder=" " />
                    <label className={labelClass}>Loan Amount (₹)</label>
                  </div>
                  <div className="floating-input-wrapper">
                    <input type="number" step="0.01" className={inputClass} value={form.approvedRoi} onChange={e => update('approvedRoi', e.target.value)} placeholder=" " />
                    <label className={labelClass}>ROI (%)</label>
                  </div>
                  <div className="floating-input-wrapper">
                    <select className={inputClass} value={form.approvedTenure} onChange={e => update('approvedTenure', e.target.value)}>
                      <option value="">Select Tenure</option>
                      {[12, 18, 24, 36, 48, 60, 72, 84].map(t => <option key={t} value={t}>{t} Months</option>)}
                    </select>
                    <label className={labelClass}>Tenure</label>
                  </div>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">⚠️ If not disbursed in 30 days, will auto-move to Cancelled stage</p>
              </div>
            )}

            {/* Disbursed Stage Fields */}
            {form.appStage === 'disbursed' && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">Disbursement Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="floating-input-wrapper">
                    <input type="number" className={inputClass} value={form.disbursedLoanAmount} onChange={e => update('disbursedLoanAmount', e.target.value)} placeholder=" " />
                    <label className={labelClass}>Loan Amount (₹)</label>
                  </div>
                  <div className="floating-input-wrapper">
                    <input type="number" step="0.01" className={inputClass} value={form.disbursedRoi} onChange={e => update('disbursedRoi', e.target.value)} placeholder=" " />
                    <label className={labelClass}>ROI (%)</label>
                  </div>
                  <div className="floating-input-wrapper">
                    <select className={inputClass} value={form.disbursedTenure} onChange={e => update('disbursedTenure', e.target.value)}>
                      <option value="">Select Tenure</option>
                      {[12, 18, 24, 36, 48, 60, 72, 84].map(t => <option key={t} value={t}>{t} Months</option>)}
                    </select>
                    <label className={labelClass}>Tenure</label>
                  </div>
                  <div className="floating-input-wrapper">
                    <input className={inputClass} value={form.loanAccountNumber} onChange={e => update('loanAccountNumber', e.target.value)} placeholder=" " />
                    <label className={labelClass}>Loan Account Number</label>
                  </div>
                </div>

                {/* Vehicle RC Status */}
                <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border">
                  <h4 className="text-xs font-semibold text-foreground mb-3">Vehicle RC Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="floating-input-wrapper">
                      <select className={inputClass} value={form.rcStatus} onChange={e => update('rcStatus', e.target.value)}>
                        <option value="">Select Status</option>
                        <option value="pending">Pending</option>
                        <option value="collected">Collected</option>
                        <option value="submitted">Submitted</option>
                      </select>
                      <label className={labelClass}>RC Status</label>
                    </div>
                    <div className="floating-input-wrapper">
                      <select className={inputClass} value={form.rcType} onChange={e => update('rcType', e.target.value)}>
                        <option value="">Select Type</option>
                        <option value="physical">Physical RC</option>
                        <option value="digital">Digital RC</option>
                      </select>
                      <label className={labelClass}>RC Type</label>
                    </div>
                    <div className="floating-input-wrapper">
                      <select className={inputClass} value={form.rcCollectedBy} onChange={e => update('rcCollectedBy', e.target.value)}>
                        <option value="">Select Collector</option>
                        <option value="self">Self</option>
                        <option value="rto_agent">RTO Agent</option>
                        <option value="banker">Banker</option>
                      </select>
                      <label className={labelClass}>Collected By</label>
                    </div>
                  </div>

                  {/* RTO Agent Details */}
                  {form.rcCollectedBy === 'rto_agent' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="floating-input-wrapper">
                        <input className={inputClass} value={form.rtoAgentNameStage} onChange={e => update('rtoAgentNameStage', e.target.value)} placeholder=" " />
                        <label className={labelClass}>RTO Agent Name</label>
                      </div>
                      <div className="floating-input-wrapper">
                        <input className={inputClass} value={form.rtoAgentMobileStage} onChange={e => update('rtoAgentMobileStage', e.target.value)} maxLength={10} placeholder=" " />
                        <label className={labelClass}>Mobile No</label>
                      </div>
                    </div>
                  )}

                  {/* Banker Details */}
                  {form.rcCollectedBy === 'banker' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="floating-input-wrapper">
                        <input className={inputClass} value={form.bankerName} onChange={e => update('bankerName', e.target.value)} placeholder=" " />
                        <label className={labelClass}>Banker Name</label>
                      </div>
                      <div className="floating-input-wrapper">
                        <input className={inputClass} value={form.bankerMobile} onChange={e => update('bankerMobile', e.target.value)} maxLength={10} placeholder=" " />
                        <label className={labelClass}>Mobile No</label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancelled Stage Fields */}
            {form.appStage === 'cancelled' && (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-3">Cancellation Details</h3>
                <div className="floating-input-wrapper">
                  <textarea className={inputClass} rows={3} value={form.cancelledRemarks} onChange={e => update('cancelledRemarks', e.target.value)} placeholder=" " />
                  <label className={labelClass}>Remarks</label>
                </div>
              </div>
            )}
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
              disabled={updateLoan.isPending}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
            >
              {updateLoan.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </span>
              ) : '✓ Update Application'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
