import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, APPLICATION_STAGES, LEAD_STATUSES } from '@/lib/mock-data';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { ArrowLeft, User, Car, IndianRupee, Building2, FileText, Eye, X, Printer, MessageCircle, Download, RefreshCw } from 'lucide-react';
import { exportLoanPDF, downloadLoanPDF } from '@/lib/pdf-export';
import { shareToCustomer, shareToWhatsAppWithPhone } from '@/lib/whatsapp-share';
import { fetchDocumentFiles } from '@/lib/document-utils';
import { toast } from 'sonner';

const DOC_TYPES: { value: string; label: string }[] = [
  { value: 'aadhar_front', label: 'Aadhar Front' },
  { value: 'aadhar_back', label: 'Aadhar Back' },
  { value: 'pan_card', label: 'PAN Card' },
  { value: 'rc_front', label: 'RC Front' },
  { value: 'rc_back', label: 'RC Back' },
  { value: 'rc_copy', label: 'RC Copy' },
  { value: 'driving_licence', label: 'Driving Licence' },
  { value: 'driving_license', label: 'Driving Licence' },
  { value: 'light_bill', label: 'Light Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'loan_statement', label: 'Loan Statement' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'rent_agreement', label: 'Rent Agreement' },
  { value: 'customer_photo', label: 'Customer Photo' },
  { value: 'photo', label: 'Photo' },
  { value: 'disbursement_memo', label: 'Disbursement Memo' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'customer_ledger', label: 'Customer Ledger' },
  { value: 'co_aadhar_front', label: 'Co-Applicant Aadhar Front' },
  { value: 'co_aadhar_back', label: 'Co-Applicant Aadhar Back' },
  { value: 'co_pan_card', label: 'Co-Applicant PAN Card' },
  { value: 'co_photo', label: 'Co-Applicant Photo' },
  { value: 'guarantor_aadhar_front', label: 'Guarantor Aadhar Front' },
  { value: 'guarantor_aadhar_back', label: 'Guarantor Aadhar Back' },
  { value: 'guarantor_pan_card', label: 'Guarantor PAN Card' },
  { value: 'guarantor_rc_front', label: 'Guarantor RC Front' },
  { value: 'guarantor_rc_back', label: 'Guarantor RC Back' },
  { value: 'guarantor_photo', label: 'Guarantor Photo' },
  { value: 'nach', label: 'NACH' },
  { value: 'other', label: 'Other' },
];

const getDocLabel = (docType: string) => {
  const found = DOC_TYPES.find(d => d.value === docType);
  if (found) return found.label;
  // fallback: convert snake_case to Title Case
  return docType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Role-based permissions
  const canEditStatus = true; // all roles can change stage
  const isTeamLeader = user?.role === 'team_leader';
  const canDelete = user?.role === 'admin';


  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => api.get(`/loans/${id}`),
    enabled: !!id,
  });

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['loan-documents', id],
    queryFn: async () => {
      try { return await api.get(`/loans/${id}/documents`); }
      catch { return []; }
    },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (newStatus: string) => api.put(`/loans/${id}`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteLoan = useMutation({
    mutationFn: () => api.delete(`/loans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Loan application deleted');
      navigate('/loans');
    },
    onError: () => toast.error('Failed to delete loan'),
  });


  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [showReapplyModal, setShowReapplyModal] = useState(false);

  const handleReapply = () => {
    if (!loan) return;
    // Store loan data in sessionStorage to pre-fill CreateLoan form
    sessionStorage.setItem('reapply_loan_data', JSON.stringify(loan));
    navigate('/loans/new?reapply=true');
  };

  const previewDocument = async (doc: any) => {
    setLoadingPreview(doc.id);
    try {
      const data = await api.get(`/documents/${doc.id}/preview`);
      setPreviewDoc({ url: data.signedUrl, name: doc.file_name });
    } catch {
      toast.error('Document not found in storage');
    } finally {
      setLoadingPreview(null);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  if (error) {
    console.error('Loan detail error:', error);
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-2">Error loading loan details</p>
        <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
        <button onClick={() => navigate('/loans')} className="mt-4 text-accent hover:underline text-sm">← Back to loans</button>
      </div>
    );
  }

  if (!loan) {
    console.log('No loan data found for ID:', id);
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Loan not found (ID: {id})</p>
        <p className="text-xs text-muted-foreground mt-2">Check if the loan exists or if you have permission to view it</p>
        <button onClick={() => navigate('/loans')} className="mt-4 text-accent hover:underline text-sm">← Back to loans</button>
      </div>
    );
  }

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-card border border-border shadow-sm rounded-xl p-3 self-start">
      <div className="flex items-center gap-3 mb-3 border-b border-border pb-2">
        <div className="p-1.5 border border-primary/10 bg-primary/5 rounded-lg text-primary">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0 bg-background/30 px-2 py-1 rounded-md border border-border">
      <p className="text-[10px] font-semibold text-muted-foreground tracking-wide">{label}</p>
      <p className="text-xs font-bold text-foreground">{value || '—'}</p>
    </div>
  );

  return (
    <div>
      <button onClick={() => navigate('/loans')} className="lg:flex hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Applications
      </button>

      {/* Mobile sticky header + actions via portal */}
      {createPortal(
        <div className="lg:hidden fixed top-12 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm rounded-b-2xl">
          {/* Row 1: back + name + stage */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => navigate('/loans')} className="p-1.5 bg-muted/50 rounded-lg shrink-0">
                <ArrowLeft size={16} className="text-primary" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate leading-tight">{loan.id}</p>
                <p className="text-[10px] text-muted-foreground truncate">{loan.applicant_name} • {(loan as any).maker_name || loan.car_make}</p>
              </div>
            </div>
            <LoanStatusBadge status={loan.status as any} />
          </div>
          {/* Row 2: action buttons */}
          <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide">
            <button onClick={() => exportLoanPDF(loan, documents as any[])} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border">
              <Printer size={12} className="text-accent" /> Export
            </button>
            <button onClick={() => setShowReapplyModal(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border">
              <RefreshCw size={12} className="text-orange-500" /> Reapply
            </button>
            <button onClick={() => downloadLoanPDF(loan, documents as any[])} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border">
              <Download size={12} className="text-accent" /> Download
            </button>
            <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-green-500/10 hover:border-green-500 transition-colors">
              <MessageCircle size={14} className="text-green-500" />
              WhatsApp
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={async () => {
                  try {
                    const docFiles = await fetchDocumentFiles(documents as any[]);
                    await shareToCustomer(loan, docFiles.map(d => d.file));
                  } catch (error) {
                    console.error('Share to customer error:', error);
                    toast.error('Failed to share to customer');
                  }
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors border-b border-border"
              >
                📱 Send to Customer
                <div className="text-muted-foreground text-[10px] mt-0.5">
                  {loan.mobile || 'No phone number'}
                </div>
              </button>
              <button
                onClick={async () => {
                  try {
                    const docFiles = await fetchDocumentFiles(documents as any[]);
                    await shareToWhatsAppWithPhone(loan, docFiles.map(d => d.file));
                  } catch (error) {
                    console.error('Share with phone error:', error);
                    toast.error('Failed to share via WhatsApp');
                  }
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors"
              >
                📞 Send to Other Number
                <div className="text-muted-foreground text-[10px] mt-0.5">
                  Enter phone number
                </div>
              </button>
            </div>
          </div>
            {canDelete && (
              <button onClick={() => { if (confirm('Delete this loan?')) deleteLoan.mutate(); }} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold whitespace-nowrap">
                Delete
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile spacer */}
      <div className="lg:hidden h-[88px]" />

      {/* Reapply Confirmation Modal */}
      {showReapplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Reapply Loan</h3>
            <p className="text-sm text-muted-foreground mb-6">This will open a pre-filled loan form with the same details. You can edit before submitting.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReapplyModal(false)} className="px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted transition-all text-sm">Cancel</button>
              <button
                onClick={handleReapply}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{loan.id}</h1>
            <LoanStatusBadge status={loan.status as any} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{loan.applicant_name} • {(loan as any).maker_name || loan.car_make} {(loan as any).model_variant_name || loan.car_model}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportLoanPDF(loan, documents as any[])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 hover:border-accent transition-colors"
          >
            <Printer size={14} className="text-accent" />
            Export
          </button>
          <button
            onClick={() => setShowReapplyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-orange-500/10 hover:border-orange-500 transition-colors"
          >
            <RefreshCw size={14} className="text-orange-500" />
            Reapply
          </button>
          <button
            onClick={() => downloadLoanPDF(loan, documents as any[])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 hover:border-accent transition-colors"
          >
            <Download size={14} className="text-accent" />
            Download
          </button>
          {/* WhatsApp Share Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-green-500/10 hover:border-green-500 transition-colors">
              <MessageCircle size={14} className="text-green-500" />
              WhatsApp
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={async () => {
                  try {
                    const docFiles = await fetchDocumentFiles(documents as any[]);
                    await shareToCustomer(loan, docFiles.map(d => d.file));
                  } catch (error) {
                    console.error('Share to customer error:', error);
                    toast.error('Failed to share to customer');
                  }
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors border-b border-border"
              >
                📱 Send to Customer
                <div className="text-muted-foreground text-[10px] mt-0.5">
                  {loan.mobile || 'No phone number'}
                </div>
              </button>
              <button
                onClick={async () => {
                  try {
                    const docFiles = await fetchDocumentFiles(documents as any[]);
                    await shareToWhatsAppWithPhone(loan, docFiles.map(d => d.file));
                  } catch (error) {
                    console.error('Share with phone error:', error);
                    toast.error('Failed to share via WhatsApp');
                  }
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors"
              >
                📞 Send to Other Number
                <div className="text-muted-foreground text-[10px] mt-0.5">
                  Enter phone number
                </div>
              </button>
            </div>
          </div>
          {canDelete && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this loan application? This action cannot be undone.')) {
                      deleteLoan.mutate();
                    }
                  }}
                  disabled={deleteLoan.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500 bg-card text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-bold text-foreground mb-4">Status Pipeline</h3>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {APPLICATION_STAGES.map((s, i) => {
            const currentIdx = APPLICATION_STAGES.findIndex(st => st.value === (loan as any).application_stage);
            const isActive = i <= currentIdx;
            const isCurrent = s.value === (loan as any).application_stage;
            const isRejectedOrCancelled = ['REJECTED', 'CANCELLED'].includes((loan as any).application_stage);
            return (
              <div key={s.value} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? isRejectedOrCancelled
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-primary text-secondary shadow-md'
                    : isActive && !isRejectedOrCancelled
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isCurrent
                      ? 'bg-white'
                      : isActive && !isRejectedOrCancelled
                        ? 'bg-primary'
                        : 'bg-muted-foreground/40'
                  }`} />
                  {s.label}
                </div>
                {i < APPLICATION_STAGES.length - 1 && (
                  <div className={`w-4 h-0.5 rounded-full ${
                    isActive && i < currentIdx && !isRejectedOrCancelled
                      ? 'bg-primary/30'
                      : 'bg-border'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 mb-4">
        <Section title="Applicant Details" icon={<User size={18} />}>
          <div className="grid grid-cols-2 gap-1">
            <Field label="Customer ID" value={(loan as any).customer_id} />
            <Field label="Loan Number" value={(loan as any).loan_number} />
            <Field label="Full Name" value={loan.applicant_name} />
            <Field label="Mobile" value={loan.mobile} />
            <Field label="Co-Applicant" value={(loan as any).co_applicant_name || '—'} />
            <Field label="Co-Applicant Mobile" value={(loan as any).co_applicant_mobile || '—'} />
            <Field label="Guarantor" value={(loan as any).guarantor_name || '—'} />
            <Field label="Guarantor Mobile" value={(loan as any).guarantor_mobile || '—'} />
            <div className="col-span-2"><Field label="Current Address" value={(loan as any).current_address || loan.address || ''} /></div>
            <Field label="Landmark" value={(loan as any).current_landmark || (loan as any).landmark || '—'} />
            <Field label="District" value={(loan as any).current_district || ''} />
            <Field label="State" value={(loan as any).current_state || '—'} />
            <Field label="Pincode" value={(loan as any).current_pincode || '—'} />
          </div>
        </Section>

        <Section title="Vehicle Details" icon={<Car size={18} />}>
          <div className="grid grid-cols-2 gap-1">
            <Field label="Registration No" value={(loan as any).vehicle_number || ''} />
            <Field label="Engine Number" value={(loan as any).engine_number || '—'} />
            <Field label="Chassis Number" value={(loan as any).chassis_number || '—'} />
            <Field label="Owner Name" value={(loan as any).owner_name || '—'} />
            <Field label="Maker" value={(loan as any).maker_name || loan.car_make || ''} />
            <Field label="Model" value={(loan as any).maker_model || '—'} />
            <Field label="Fuel Type" value={(loan as any).fuel_type || '—'} />
            <Field label="Manufacturing Date" value={(loan as any).manufacturing_date ? new Date((loan as any).manufacturing_date).toLocaleDateString('en-IN') : '—'} />
            <Field label="Ownership Type" value={(loan as any).ownership_type || '—'} />
            <Field label="Case Type" value={(loan as any).case_type || '—'} />
          </div>
        </Section>

        <Section title="Loan & EMI Details" icon={<IndianRupee size={18} />}>
          <div className="grid grid-cols-2 gap-1">
            <Field label="Loan Amount" value={formatCurrency(Number(loan.loan_amount))} />
            <Field label="Tenure" value={`${loan.tenure} months`} />
                   
          </div>
        </Section>

        {((loan as any).existing_loan_status || (loan as any).existing_loan_amount) && (
          <Section title="Existing Loan & EMI Details" icon={<IndianRupee size={18} />}>
            <div className="grid grid-cols-2 gap-1">
              <Field label="Loan Status" value={(loan as any).existing_loan_status || '—'} />
              <Field label="Loan Amount" value={(loan as any).existing_loan_amount ? formatCurrency(Number((loan as any).existing_loan_amount)) : '—'} />
              <Field label="Tenure (Months)" value={(loan as any).existing_tenure ? String((loan as any).existing_tenure) : '—'} />
              <Field label="EMI Amount" value={(loan as any).existing_emi ? formatCurrency(Number((loan as any).existing_emi)) : '—'} />
              <Field label="No of EMI Paid" value={(loan as any).no_of_emi_paid ? String((loan as any).no_of_emi_paid) : '—'} />
              <Field label="Bouncing in Last 3M" value={(loan as any).bouncing_3_months != null ? String((loan as any).bouncing_3_months) : '—'} />
              <Field label="Bouncing in Last 6M" value={(loan as any).bouncing_6_months != null ? String((loan as any).bouncing_6_months) : '—'} />
            </div>
          </Section>
        )}

        <Section title="Financier Details" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-2 gap-1">
            <Field label="Lender" value={(loan as any).financier_name || (loan as any).selected_financier || (loan as any).bank_name || '—'} />
            <Field label="Branch" value={(loan as any).financier_branch_name || '—'} />
            <Field label="Sales Manager" value={(loan as any).financier_executive_name || '—'} />
            <Field label="SM Mobile" value={(loan as any).financier_executive_mobile || '—'} />
            <Field label="Area Manager" value={(loan as any).financier_area_manager_name || '—'} />
            <Field label="AM Mobile" value={(loan as any).financier_area_manager_mobile || '—'} />
          </div>
        </Section>

        <Section title="Insurance Details" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-2 gap-x-1 gap-y-1">
            {((loan as any).insurance_company || (loan as any).insurance_company_name) && (
              <Field label="Insurance Company" value={(loan as any).insurance_company_name || (loan as any).insurance_company} />
            )}
            {(loan as any).premium_amount && (
              <Field label="Premium Amount" value={formatCurrency(Number((loan as any).premium_amount))} />
            )}
            {(loan as any).insurance_policy_number && (
              <Field label="Policy Number" value={(loan as any).insurance_policy_number} />
            )}
            {(loan as any).insurance_date && (
              <Field label="Insurance Date" value={new Date((loan as any).insurance_date).toLocaleDateString('en-IN')} />
            )}
            {(loan as any).insurance_valid_upto && (
              <Field label="Insurance Valid Upto" value={new Date((loan as any).insurance_valid_upto).toLocaleDateString('en-IN')} />
            )}
            {(loan as any).pucc_valid_upto && (
              <Field label="PUCC Valid Upto" value={new Date((loan as any).pucc_valid_upto).toLocaleDateString('en-IN')} />
            )}
          </div>
        </Section>

        <Section title="Income Details" icon={<IndianRupee size={18} />}>
          <div className="grid grid-cols-2 gap-1">
            <Field label="Income Source" value={(loan as any).income_source} />
            <Field label="Monthly Income" value={(loan as any).monthly_income ? formatCurrency(Number((loan as any).monthly_income)) : (loan as any).net_monthly_salary ? formatCurrency(Number((loan as any).net_monthly_salary)) : '—'} />

            {/* Salaried */}
            {(loan as any).income_source === 'Salaried' && <>
              <Field label="Company Name" value={(loan as any).company_name} />
              <Field label="Designation" value={(loan as any).designation} />
              <Field label="Current Job (Yrs)" value={(loan as any).current_job_years} />
              <Field label="Total Work Exp (Yrs)" value={(loan as any).total_work_exp} />
              <Field label="Net Monthly Salary" value={(loan as any).net_monthly_salary != null && (loan as any).net_monthly_salary !== '' ? formatCurrency(Number((loan as any).net_monthly_salary)) : '—'} />
              <Field label="Salary Credit Mode" value={(loan as any).salary_credit_mode} />
              <Field label="Salary Slip Available" value={(loan as any).salary_slip_available} />
            </>}
          </div>
        </Section>

        <Section title="Application Stage Details" icon={<FileText size={18} />}>
          {(() => {
            const l = loan as any;
            // Parse stage_history to extract data from all past stages
            let history: any[] = [];
            try {
              history = Array.isArray(l.stage_history)
                ? l.stage_history
                : typeof l.stage_history === 'string'
                ? JSON.parse(l.stage_history)
                : [];
            } catch { history = []; }

            // Helper: find data from history for a given stage
            const fromHistory = (stage: string) =>
              history.find((h: any) => h.stage === stage);

            const loginEntry = fromHistory('LOGIN');
            const inProcessEntry = fromHistory('IN_PROCESS');
            const approvedEntry = fromHistory('APPROVED');
            const disbursedEntry = fromHistory('DISBURSED');
            const rejectedEntry = fromHistory('REJECTED');
            const cancelledEntry = fromHistory('CANCELLED');

            // Resolve values: prefer DB columns, fallback to history
            const appScore = l.app_score || loginEntry?.appScore;
            const creditScore = l.credit_score || loginEntry?.creditScore;
            const tags = l.tags || inProcessEntry?.tags;
            const approvedAmount = approvedEntry?.loanAmount;
            const approvedRoi = approvedEntry?.roi;
            const approvedTenure = approvedEntry?.tenure;
            const disbursedAmount = disbursedEntry?.loanAmount;
            const disbursedRoi = disbursedEntry?.roi;
            const disbursedTenure = disbursedEntry?.tenure;
            const lan = l.loan_account_number || disbursedEntry?.loanAccountNumber;
            const rcType = l.rc_type || disbursedEntry?.rcType;
            const rcBy = l.rc_collected_by || disbursedEntry?.collectedBy;
            const rejectedRemarks = l.rejection_remarks || rejectedEntry?.remarks;
            const cancelledRemarks = l.cancellation_remarks || cancelledEntry?.remarks;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-1">
                  <Field label="Current Stage" value={l.application_stage || l.app_stage || loan.status || '—'} />
                  <Field label="Stage Changed At" value={l.stage_changed_at ? new Date(l.stage_changed_at).toLocaleDateString('en-IN') : '—'} />
                </div>

                {/* Login */}
                {(appScore || creditScore) && (
                  <div>
                    <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Login Stage</p>
                    <div className="grid grid-cols-2 gap-1">
                      <Field label="App Score" value={appScore?.toString() || '—'} />
                      <Field label="Credit Score" value={creditScore?.toString() || '—'} />
                    </div>
                  </div>
                )}

                {/* In Process */}
                {tags && (Array.isArray(tags) ? tags.length > 0 : true) && (
                  <div>
                    <p className="text-xs font-bold text-yellow-600 mb-2 uppercase tracking-wide">In Process Stage</p>
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Pendency Tags" value={Array.isArray(tags) ? tags.join(', ') : tags} />
                    </div>
                  </div>
                )}

                {/* Approved */}
                {approvedEntry && (
                  <div>
                    <p className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wide">Approved Stage</p>
                    <div className="grid grid-cols-2 gap-1">
                      <Field label="Approved Loan Amount" value={approvedEntry.loanAmount ? formatCurrency(Number(approvedEntry.loanAmount)) : '—'} />
                      <Field label="Approved ROI" value={approvedEntry.roi ? `${approvedEntry.roi}%` : '—'} />
                      <Field label="Approved Tenure" value={approvedEntry.tenure ? `${approvedEntry.tenure} months` : '—'} />
                    </div>
                  </div>
                )}

                {/* Disbursed */}
                {disbursedEntry && (
                  <div>
                    <p className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wide">Disbursed Stage</p>
                    <div className="grid grid-cols-2 gap-1">
                      <Field label="Disbursed Loan Amount" value={disbursedEntry.loanAmount ? formatCurrency(Number(disbursedEntry.loanAmount)) : '—'} />
                      <Field label="Disbursed ROI" value={disbursedEntry.roi ? `${disbursedEntry.roi}%` : '—'} />
                      <Field label="Disbursed Tenure" value={disbursedEntry.tenure ? `${disbursedEntry.tenure} months` : '—'} />
                      <Field label="Loan Account Number" value={lan || '—'} />
                      {rcType && <Field label="RC Type" value={rcType} />}
                      {rcBy && <Field label="RC Collected By" value={rcBy} />}
                      {(l.rto_agent_name_rc || disbursedEntry.agentName) && <Field label="Agent Name" value={l.rto_agent_name_rc || disbursedEntry.agentName} />}
                      {(l.rto_agent_mobile || disbursedEntry.agentMobile) && <Field label="Agent Mobile" value={l.rto_agent_mobile || disbursedEntry.agentMobile} />}
                      {(l.banker_name || disbursedEntry.bankerName) && <Field label="Banker Name" value={l.banker_name || disbursedEntry.bankerName} />}
                      {(l.banker_mobile || disbursedEntry.bankerMobile) && <Field label="Banker Mobile" value={l.banker_mobile || disbursedEntry.bankerMobile} />}
                    </div>
                  </div>
                )}

                {/* Rejected */}
                {rejectedRemarks && (
                  <div>
                    <p className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wide">Rejected Stage</p>
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Rejection Remarks" value={rejectedRemarks} />
                    </div>
                  </div>
                )}

                {/* Cancelled */}
                {cancelledRemarks && (
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Cancelled Stage</p>
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Cancellation Remarks" value={cancelledRemarks} />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Section>

        <Section title="Important Dates" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-2 gap-1">
            <Field label="Login Date" value={(loan as any).login_date ? new Date((loan as any).login_date).toLocaleDateString('en-IN') : '—'} />
            <Field label="Sourcing Person" value={(loan as any).sourcing_person_name || '—'} />
            <div className="col-span-2"><Field label="Remark" value={(loan as any).remark || '—'} /></div>
          </div>
        </Section>
      </div>

      {/* Documents Section (Read-only) */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-accent"><FileText size={18} /></span>
          <h3 className="font-semibold text-foreground">Loan Documents</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{(documents as any[]).length} files</span>
        </div>

        {/* Inline Preview */}
        {previewDoc && (
          <div className="mb-4 rounded-xl border border-border overflow-hidden bg-background">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/60 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{previewDoc.name}</p>
              <button onClick={() => setPreviewDoc(null)} className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <iframe
              src={previewDoc.url}
              className="w-full border-0"
              style={{ height: '60vh', minHeight: '300px' }}
              title={previewDoc.name}
            />
          </div>
        )}

        {/* Document list */}
        {(documents as any[]).length > 0 && (
          <div className="grid gap-2">
            {(documents as any[]).map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <FileText size={16} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{getDocLabel(doc.document_type)}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {doc.file_name} • {new Date(doc.created_at).toLocaleDateString('en-IN')}
                    {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                  </p>
                </div>
                <button
                  onClick={() => previewDocument(doc)}
                  disabled={loadingPreview === doc.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-accent/10 hover:bg-accent/20 text-accent transition-colors text-xs font-medium disabled:opacity-50"
                  title="Preview"
                >
                  <Eye size={14} /> {loadingPreview === doc.id ? 'Loading…' : 'View'}
                </button>
              </div>
            ))}
          </div>
        )}
        {(documents as any[]).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No documents available.</p>
        )}
      </div>
    </div>
  );
}
