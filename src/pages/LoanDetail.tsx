import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, LEAD_STATUSES } from '@/lib/mock-data';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { ArrowLeft, User, Car, IndianRupee, Building2, FileText, Eye, X, Printer, MessageCircle, Mail, Download } from 'lucide-react';
import { exportLoanPDF, shareLoanPDF, downloadLoanPDF } from '@/lib/pdf-export';
import { toast } from 'sonner';

const DOC_TYPES = [
  { value: 'rc_copy', label: 'RC Copy' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'nach', label: 'NACH' },
  { value: 'other', label: 'Other' },
];

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();


  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch loan');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['loan-documents', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}/documents`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteLoan = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to delete loan');
      return res.json();
    },
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

  const previewDocument = async (doc: any) => {
    setLoadingPreview(doc.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${doc.id}/preview`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewDoc({ url: data.signedUrl, name: doc.file_name });
      } else {
        toast.error('Document not found in storage');
      }
    } catch (error) {
      toast.error('Failed to load document');
    } finally {
      setLoadingPreview(null);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  if (!loan) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Loan not found</p>
        <button onClick={() => navigate('/loans')} className="mt-4 text-accent hover:underline text-sm">← Back to loans</button>
      </div>
    );
  }

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-accent">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  );

  const currentIdx = LEAD_STATUSES.findIndex(s => s.value === loan.status);

  return (
    <div className="max-w-6xl mx-auto px-4">
      <button onClick={() => navigate('/loans')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Applications
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{loan.id}</h1>
            <LoanStatusBadge status={loan.status as any} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{loan.applicant_name} • {(loan as any).maker_name || loan.car_make} {(loan as any).model_variant_name || loan.car_model}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportLoanPDF(loan)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 hover:border-accent transition-colors"
          >
            <Printer size={14} className="text-accent" />
            Export
          </button>
          <button
            onClick={() => downloadLoanPDF(loan)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 hover:border-accent transition-colors"
          >
            <Download size={14} className="text-accent" />
            Download
          </button>
          <button
            onClick={() => shareLoanPDF(loan)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-green-500/10 hover:border-green-500 transition-colors"
          >
            <MessageCircle size={14} className="text-green-500" />
            WhatsApp
          </button>
          <button
            onClick={() => {
              const subject = `Loan Application - ${loan.id} | ${loan.applicant_name}`;
              const body = `Finonest India - Loan Application Details\n\nApplication ID: ${loan.id}\nApplicant: ${loan.applicant_name}\nMobile: ${loan.mobile}\nVehicle: ${(loan as any).maker_name || loan.car_make || ''} ${(loan as any).model_variant_name || loan.car_model || ''}\nLoan Amount: ${formatCurrency(Number(loan.loan_amount))}\nStatus: ${loan.status}\nEMI: ${formatCurrency(Number((loan as any).emi_amount || loan.emi || 0))}\nTenure: ${loan.tenure} months\n\nGenerated by Finonest India`;
              window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-blue-500/10 hover:border-blue-500 transition-colors"
          >
            <Mail size={14} className="text-blue-500" />
            Email
          </button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <>
              <select
                value={loan.status}
                onChange={e => updateStatus.mutate(e.target.value)}
                disabled={updateStatus.isPending}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground focus:outline-none focus:border-accent"
              >
                {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
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
            </>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="stat-card mb-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-foreground mb-3">Status Pipeline</h3>
        <div className="flex items-center gap-1 min-w-max">
          {LEAD_STATUSES.map((s, i) => {
            const isActive = i <= currentIdx && loan.status !== 'rejected';
            const isCurrent = s.value === loan.status;
            return (
              <div key={s.value} className="flex items-center gap-1">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isCurrent ? 'bg-accent text-accent-foreground' : isActive ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                  <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-accent-foreground' : isActive ? 'bg-accent' : 'bg-muted-foreground/40'}`} />
                  {s.label}
                </div>
                {i < LEAD_STATUSES.length - 1 && (
                  <div className={`w-6 h-0.5 ${isActive && i < currentIdx ? 'bg-accent' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <Section title="Applicant Details" icon={<User size={18} />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Customer ID" value={(loan as any).customer_id} />
            <Field label="Loan Number" value={(loan as any).loan_number} />
            <Field label="Full Name" value={loan.applicant_name} />
            <Field label="Mobile" value={loan.mobile} />
            <Field label="PAN" value={(loan as any).pan || ''} />
            <Field label="Aadhaar" value={(loan as any).aadhaar || ''} />
            <Field label="Co-Applicant" value={(loan as any).co_applicant_name || '—'} />
            <Field label="Co-Applicant Mobile" value={(loan as any).co_applicant_mobile || '—'} />
            <Field label="Guarantor" value={(loan as any).guarantor_name || '—'} />
            <Field label="Guarantor Mobile" value={(loan as any).guarantor_mobile || '—'} />
            <Field label="Our Branch" value={(loan as any).our_branch || '—'} />
            <div className="col-span-2"><Field label="Current Address" value={(loan as any).current_address || loan.address || ''} /></div>
            <Field label="Village" value={(loan as any).current_village || ''} />
            <Field label="Tehsil" value={(loan as any).current_tehsil || ''} />
            <Field label="District" value={(loan as any).current_district || ''} />
            <Field label="Pincode" value={(loan as any).current_pincode || ''} />
            <div className="col-span-2"><Field label="Permanent Address" value={(loan as any).permanent_address || ''} /></div>
            <Field label="Perm. Village" value={(loan as any).permanent_village || ''} />
            <Field label="Perm. Tehsil" value={(loan as any).permanent_tehsil || ''} />
            <Field label="Perm. District" value={(loan as any).permanent_district || ''} />
            <Field label="Perm. Pincode" value={(loan as any).permanent_pincode || ''} />
          </div>
        </Section>

        <Section title="Vehicle Details" icon={<Car size={18} />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Registration No" value={(loan as any).vehicle_number || ''} />
            <Field label="Maker" value={(loan as any).maker_name || loan.car_make || ''} />
            <Field label="Model/Variant" value={(loan as any).model_variant_name || loan.car_model || ''} />
            <Field label="Mfg Year" value={(loan as any).mfg_year || ''} />
            <Field label="Vertical" value={(loan as any).vertical || ''} />
            <Field label="Scheme" value={(loan as any).scheme || ''} />
            <Field label="Loan Type" value={(loan as any).loan_type_vehicle || '—'} />
          </div>
        </Section>

        <Section title="Loan & EMI Details" icon={<IndianRupee size={18} />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Loan Amount" value={formatCurrency(Number(loan.loan_amount))} />
            <Field label="LTV" value={(loan as any).ltv ? `${(loan as any).ltv}%` : '—'} />
            <Field label="IRR" value={(loan as any).irr ? `${(loan as any).irr}%` : `${loan.interest_rate}%`} />
            <Field label="Tenure" value={`${loan.tenure} months`} />
            <Field label="Monthly EMI" value={formatCurrency(Number((loan as any).emi_amount || loan.emi))} />
            <Field label="Total Interest" value={formatCurrency(Number((loan as any).total_interest || 0))} />
            <Field label="EMI Start Date" value={(loan as any).emi_start_date ? new Date((loan as any).emi_start_date).toLocaleDateString('en-IN') : '—'} />
            <Field label="EMI End Date" value={(loan as any).emi_end_date ? new Date((loan as any).emi_end_date).toLocaleDateString('en-IN') : '—'} />
            <Field label="Processing Fee" value={(loan as any).processing_fee ? formatCurrency(Number((loan as any).processing_fee)) : '—'} />
            <div className="col-span-2"><Field label="Income Source" value={(loan as any).income_source || '—'} /></div>
            <Field label="Monthly Income" value={(loan as any).monthly_income ? formatCurrency(Number((loan as any).monthly_income)) : '—'} />
          </div>
        </Section>

        <Section title="Financier Details" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Assigned Bank" value={(loan as any).banks?.name || '—'} />
            <Field label="Assigned Broker" value={(loan as any).brokers?.name || '—'} />
            <Field label="Sanction Amount" value={(loan as any).sanction_amount ? formatCurrency(Number((loan as any).sanction_amount)) : '—'} />
            <Field label="Sanction Date" value={(loan as any).sanction_date ? new Date((loan as any).sanction_date).toLocaleDateString('en-IN') : '—'} />
          </div>
        </Section>

        <Section title="Insurance & RTO" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Insurance Company" value={(loan as any).insurance_company_name || '—'} />
            <Field label="Premium" value={(loan as any).premium_amount ? formatCurrency(Number((loan as any).premium_amount)) : '—'} />
            <Field label="Policy Number" value={(loan as any).insurance_policy_number || '—'} />
            <Field label="Insurance Date" value={(loan as any).insurance_date ? new Date((loan as any).insurance_date).toLocaleDateString('en-IN') : '—'} />
            <Field label="RC Owner" value={(loan as any).rc_owner_name || '—'} />
            <Field label="RTO Agent" value={(loan as any).rto_agent_name || '—'} />
            <Field label="Agent Mobile" value={(loan as any).agent_mobile_no || '—'} />
          </div>
        </Section>

        <Section title="Deduction & Disbursement" icon={<IndianRupee size={18} />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total Deduction" value={(loan as any).total_deduction ? formatCurrency(Number((loan as any).total_deduction)) : '—'} />
            <Field label="Net Disbursement" value={(loan as any).net_disbursement_amount ? formatCurrency(Number((loan as any).net_disbursement_amount)) : '—'} />
            <Field label="Payment Received" value={(loan as any).payment_received_date ? new Date((loan as any).payment_received_date).toLocaleDateString('en-IN') : '—'} />
          </div>
        </Section>

        <Section title="Important Dates" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Login Date" value={(loan as any).login_date ? new Date((loan as any).login_date).toLocaleDateString('en-IN') : '—'} />
            <Field label="Approval Date" value={(loan as any).approval_date ? new Date((loan as any).approval_date).toLocaleDateString('en-IN') : '—'} />
            <Field label="Sourcing Person" value={(loan as any).sourcing_person_name || '—'} />
            <div className="col-span-2"><Field label="Remark" value={(loan as any).remark || '—'} /></div>
            <Field label="Created" value={new Date(loan.created_at).toLocaleDateString('en-IN')} />
            <Field label="Last Updated" value={new Date(loan.updated_at).toLocaleDateString('en-IN')} />
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
                  <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOC_TYPES.find(d => d.value === doc.document_type)?.label} •{' '}
                    {new Date(doc.created_at).toLocaleDateString('en-IN')}
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
