import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, APPLICATION_STAGES, LEAD_STATUSES } from '@/lib/mock-data';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { ArrowLeft, User, Car, IndianRupee, Building2, FileText, Eye, X, Printer, Share2, Download, RefreshCw, Edit2, Settings } from 'lucide-react';
import { exportLoanPDF, downloadLoanPDF, prepareLoanShareBundle, prepareDocumentShareBundle } from '@/lib/pdf-export';
import { downloadRCTemplatePDF, exportRCTemplatePDF, shareRCTemplatePDF } from '@/lib/rc-template';
import { toast } from 'sonner';
import LoanApplicationStageManager from '@/components/LoanApplicationStageManager';
import CibilCreditReport from '@/components/CibilCreditReport';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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
  { value: 'loan_application_pdf', label: 'Loan Application PDF' },
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
      try { 
        const docs = await api.get(`/loans/${id}/documents`);
        // Strong deduplication: Remove duplicates based on document_type and file_name
        const uniqueDocs = docs.filter((doc, index, self) => {
          const firstIndex = self.findIndex(d => 
            d.document_type === doc.document_type && 
            d.file_name === doc.file_name
          );
          return index === firstIndex;
        });
        console.log(`Fetched ${docs.length} documents, filtered to ${uniqueDocs.length} unique documents`);
        return uniqueDocs;
      }
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


  const [activeTab, setActiveTab] = useState<'details' | 'credit'>('details');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [showReapplyModal, setShowReapplyModal] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showRCMenu, setShowRCMenu] = useState(false);
  const [shareBundle, setShareBundle] = useState<Awaited<ReturnType<typeof prepareLoanShareBundle>> | null>(null);
  const [shareBundleLoading, setShareBundleLoading] = useState(false);
  const [documentShareBundle, setDocumentShareBundle] = useState<Awaited<ReturnType<typeof prepareDocumentShareBundle>> | null>(null);
  const [documentShareBundleLoading, setDocumentShareBundleLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function buildBundle() {
      if (!loan) return;
      setShareBundleLoading(true);
      try {
        const bundle = await prepareLoanShareBundle(loan, documents as any[]);
        if (!cancelled) setShareBundle(bundle);
      } catch (error) {
        console.error('Failed to prepare share bundle:', error);
        if (!cancelled) setShareBundle(null);
      } finally {
        if (!cancelled) setShareBundleLoading(false);
      }
    }

    buildBundle();
    return () => { cancelled = true; };
  }, [loan, documents]);

  useEffect(() => {
    let cancelled = false;

    async function buildDocumentBundle() {
      if (!documents.length) {
        setDocumentShareBundle(null);
        return;
      }
      setDocumentShareBundleLoading(true);
      try {
        const bundle = await prepareDocumentShareBundle(documents as any[]);
        if (!cancelled) {
          setDocumentShareBundle(bundle);
        }
      } catch (error) {
        console.error('Failed to prepare document share bundle:', error);
        if (!cancelled) {
          setDocumentShareBundle(null);
        }
      } finally {
        if (!cancelled) {
          setDocumentShareBundleLoading(false);
        }
      }
    }

    buildDocumentBundle();

    return () => {
      cancelled = true;
    };
  }, [documents]);

  const handleReapply = () => {
    if (!loan) return;
    // Store loan data in sessionStorage to pre-fill CreateLoan form
    sessionStorage.setItem('reapply_loan_data', JSON.stringify(loan));
    navigate('/loans/new?reapply=true');
  };

  const previewDocument = async (doc: any) => {
    setLoadingPreview(doc.id);
    try {
      // Use public download endpoint directly (no auth required)
      const downloadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/documents/${doc.id}/download`);
      
      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const url = URL.createObjectURL(blob);
        setPreviewDoc({ url, name: doc.file_name });
      } else {
        throw new Error(`Document not found (${downloadResponse.status})`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(`Unable to preview document. Document ID ${doc.id} may not exist or may have been deleted.`);
    } finally {
      setLoadingPreview(null);
    }
  };

  const handleShareAll = async () => {
    try {
      if (!shareBundle) {
        toast.info(shareBundleLoading ? 'Loading saved PDF…' : 'Saved PDF is still loading. Please try again in a moment.');
        return;
      }

      if (!navigator.share) {
        toast.error('Sharing not available on this device');
        return;
      }

      if (navigator.canShare && !navigator.canShare({ files: shareBundle.files })) {
        toast.error('This device cannot share the prepared files');
        return;
      }

      await navigator.share({
        title: shareBundle.title,
        text: shareBundle.text,
        files: shareBundle.files,
      });
      toast.success('Shared PDF!');
    } catch (error: any) {
      console.error('Share error:', error);
      if (error?.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else {
        toast.error(error?.message || 'Failed to share loan application');
      }
    }
  };

  const handleShareDocuments = async () => {
    if (!documentShareBundle) {
      toast.info(documentShareBundleLoading ? 'Loading documents…' : 'Documents are still loading. Please try again in a moment.');
      return;
    }

    if (!navigator.share) {
      toast.error('Sharing not available on this device');
      return;
    }

    try {
      if (navigator.canShare && !navigator.canShare({ files: documentShareBundle.files })) {
        toast.error('This device cannot share the prepared documents');
        return;
      }

      await navigator.share({
        title: documentShareBundle.title,
        text: documentShareBundle.text,
        files: documentShareBundle.files,
      });
      toast.success(`Shared ${documentShareBundle.docCount} images!`);
    } catch (error: any) {
      console.error('Document share error:', error);
      if (error?.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else {
        toast.error(error?.message || 'Failed to share documents');
      }
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
            <button onClick={() => setShowReapplyModal(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border">
              <RefreshCw size={12} className="text-orange-500" /> Reapply
            </button>
            {user?.role !== 'executive' && (
              <button onClick={() => navigate(`/loans/edit/${loan.id}`)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border">
                <Edit2 size={12} className="text-blue-500" /> Edit
              </button>
            )}
            <button onClick={() => setShowStageManager(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border">
              <Settings size={12} className="text-purple-500" /> Stage
            </button>
            <button onClick={() => setShowShareMenu(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border" title="Share options">
              <Share2 size={12} className="text-blue-500" /> Share
            </button>
            <button onClick={() => setShowRCMenu(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border" title="RC Template options">
              <FileText size={12} className="text-cyan-500" /> RC
            </button>
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

      <Sheet open={showShareMenu} onOpenChange={setShowShareMenu}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl px-5 pb-6 pt-5">
          <SheetHeader>
            <SheetTitle>Share Loan</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            <button
              onClick={() => {
                setShowShareMenu(false);
                handleShareAll();
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Share PDF</p>
                  <p className="text-xs text-muted-foreground">Saved loan PDF only</p>
                </div>
                <Share2 size={18} className="text-blue-500 shrink-0" />
              </div>
            </button>
            {documents.length > 0 && (
              <button
                onClick={() => {
                  setShowShareMenu(false);
                  handleShareDocuments();
                }}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Share Images</p>
                    <p className="text-xs text-muted-foreground">All loan documents</p>
                  </div>
                  <FileText size={18} className="text-green-500 shrink-0" />
                </div>
              </button>
            )}
            <button
              onClick={() => {
                setShowShareMenu(false);
                downloadLoanPDF(loan, documents as any[]);
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Download PDF</p>
                  <p className="text-xs text-muted-foreground">Save a copy on this device</p>
                </div>
                <Download size={18} className="text-accent shrink-0" />
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showRCMenu} onOpenChange={setShowRCMenu}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl px-5 pb-6 pt-5">
          <SheetHeader>
            <SheetTitle>RC Template</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            <button
              onClick={() => {
                setShowRCMenu(false);
                downloadRCTemplatePDF(loan);
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Download</p>
                  <p className="text-xs text-muted-foreground">Save RC template on device</p>
                </div>
                <Download size={18} className="text-cyan-500 shrink-0" />
              </div>
            </button>
            <button
              onClick={() => {
                setShowRCMenu(false);
                exportRCTemplatePDF(loan);
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">View</p>
                  <p className="text-xs text-muted-foreground">Preview RC template</p>
                </div>
                <Eye size={18} className="text-indigo-500 shrink-0" />
              </div>
            </button>
            {navigator.share && (
              <button
                onClick={() => {
                  setShowRCMenu(false);
                  shareRCTemplatePDF(loan);
                }}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Share</p>
                    <p className="text-xs text-muted-foreground">Share RC template natively</p>
                  </div>
                  <Share2 size={18} className="text-blue-500 shrink-0" />
                </div>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
          {user?.role !== 'executive' && (
            <button
              onClick={() => navigate(`/loans/edit/${loan.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-blue-500/10 hover:border-blue-500 transition-colors"
            >
              <Edit2 size={14} className="text-blue-500" />
              Edit
            </button>
          )}
          <button
            onClick={() => setShowStageManager(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-purple-500/10 hover:border-purple-500 transition-colors"
          >
            <Settings size={14} className="text-purple-500" />
            Update Stage
          </button>
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-blue-500/10 hover:border-blue-500 transition-colors"
              title="Share options"
            >
              <Share2 size={14} className="text-blue-500" />
              Share
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={handleShareAll}
                disabled={shareBundleLoading}
                className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50 disabled:opacity-60"
              >
                <Share2 size={12} className="text-blue-500" />
                Share PDF
              </button>
              {documents.length > 0 && (
                <button
                  onClick={handleShareDocuments}
                  disabled={documentShareBundleLoading}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50 disabled:opacity-60"
                >
                  <FileText size={12} className="text-green-500" />
                  Share Images
                </button>
              )}
              <button
                onClick={() => downloadLoanPDF(loan, documents as any[])}
                className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2"
              >
                <Download size={12} className="text-accent" />
                Download PDF
              </button>
            </div>
          </div>
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-cyan-500/10 hover:border-cyan-500 transition-colors"
              title="RC Template options"
            >
              <FileText size={14} className="text-cyan-500" />
              RC Template
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => downloadRCTemplatePDF(loan)}
                className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50"
              >
                <Download size={12} className="text-cyan-500" />
                Download
              </button>
              <button
                onClick={() => exportRCTemplatePDF(loan)}
                className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50"
              >
                <Eye size={12} className="text-indigo-500" />
                View
              </button>
              {navigator.share && (
                <button
                  onClick={() => shareRCTemplatePDF(loan)}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2"
                >
                  <Share2 size={12} className="text-blue-500" />
                  Share
                </button>
              )}
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

      <div className="bg-card border border-border shadow-sm rounded-2xl p-5 mb-6 mt-4 lg:mt-0">
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

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 bg-muted/40 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'details' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Loan Details
        </button>
        <button
          onClick={() => setActiveTab('credit')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'credit' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Credit Report
        </button>
      </div>

      {activeTab === 'credit' && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <CibilCreditReport loan={loan} />
        </div>
      )}

      {activeTab === 'details' && <div className="grid grid-cols-1 gap-1 mb-4">
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
            const currentStage = l.application_stage || l.app_stage || loan.status || 'submitted';

            // Resolve values: prefer DB columns, fallback to history
            const appScore = l.app_score || loginEntry?.appScore;
            const creditScore = l.credit_score || loginEntry?.creditScore;

            return (
              <div className="space-y-4">
                {/* Current Stage */}
                <div>
                  <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Current Status</p>
                  <div className="grid grid-cols-2 gap-1">
                    <Field label="Current Stage" value={currentStage} />
                    <Field label="Stage Changed At" value={l.stage_changed_at ? new Date(l.stage_changed_at).toLocaleDateString('en-IN') : '—'} />
                  </div>
                </div>

                {/* Login Stage - Only show if data exists */}
                {(appScore || creditScore) && (
                  <div>
                    <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Login Stage</p>
                    <div className="grid grid-cols-2 gap-1">
                      {appScore && <Field label="App Score" value={appScore.toString()} />}
                      {creditScore && <Field label="Credit Score" value={creditScore.toString()} />}
                    </div>
                  </div>
                )}

                {/* Submitted Stage Info */}
                <div>
                  <p className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wide">Submitted Stage</p>
                  <div className="grid grid-cols-2 gap-1">
                    <Field label="Login Date" value={(loan as any).login_date ? new Date((loan as any).login_date).toLocaleDateString('en-IN') : '—'} />
                    <Field label="Sourcing Person" value={(loan as any).sourcing_person_name || '—'} />
                  </div>
                </div>
              </div>
            );
          })()}
        </Section>

        <Section title="Other Details" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-1 gap-1">
            <div className="col-span-1"><Field label="Remark" value={(loan as any).remark || '—'} /></div>
          </div>
        </Section>
      </div>}


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
              <button onClick={() => {
                if (previewDoc.url.startsWith('blob:')) {
                  URL.revokeObjectURL(previewDoc.url);
                }
                setPreviewDoc(null);
              }} className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <iframe
              src={previewDoc.url}
              className="w-full border-0"
              style={{ height: '60vh', minHeight: '300px' }}
              title={previewDoc.name}
              sandbox="allow-same-origin allow-scripts"
              loading="lazy"
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">{doc.file_name}</p>
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

      {/* Loan Application Stage Manager Modal */}
      <LoanApplicationStageManager
        loan={loan}
        isOpen={showStageManager}
        onClose={() => setShowStageManager(false)}
      />
    </div>
  );
}
