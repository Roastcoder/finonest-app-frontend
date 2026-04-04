import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, Car, IndianRupee, ArrowRight, FileText, Copy, X, ClipboardCheck, Share2, Phone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/mock-data';
import { FINANCIERS } from '@/lib/financiers';
import DocumentUpload, { DocumentList } from '@/components/DocumentUpload';
import ApplicationStageDisplay from '@/components/ApplicationStageDisplay';
import ApplicationStageModal from '@/components/ApplicationStageModal';
import { ApplicationStage, ApplicationStageData, STAGE_LABELS, STAGE_COLORS } from '@/types/applicationStages';
import { shareContent } from '@/lib/native-share';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showReapplyModal, setShowReapplyModal] = useState(false);
  const [selectedFinancier, setSelectedFinancier] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);

  const { data: banks = [] } = useQuery({
    queryKey: ['banks-list'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/banks`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
  });

  const handleStageUpdate = (stageData: ApplicationStageData) => {
    // Update the lead in the cache
    queryClient.setQueryData(['lead', id], (oldData: any) => {
      if (!oldData) return oldData;
      return { 
        ...oldData, 
        application_stage: stageData.stage, 
        stage_data: stageData,
        stage_history: [...(oldData.stage_history || []), stageData]
      };
    });
    setShowStageModal(false);
  };

  const queryClient = useQueryClient();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      console.log('Fetching lead with ID:', id);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/leads/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        console.log('Lead fetch response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Lead fetch error:', errorText);
          throw new Error(`Failed to fetch lead: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        console.log('Lead data received:', data);
        return data;
      } catch (error) {
        console.error('Lead fetch error:', error);
        throw error;
      }
    },
    enabled: !!id,
  });

  const cloneMutation = useMutation({
    mutationFn: async (newFinancierId?: number) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/leads/${id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ new_financier_id: newFinancierId })
      });
      if (!response.ok) throw new Error('Failed to clone lead');
      return await response.json();
    },
    onSuccess: (data) => {
      toast.success('Lead successfully cloned for reapplication!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowReapplyModal(false);
      navigate(`/leads/${data.leadId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error cloning lead');
    }
  });

  const handleReapply = () => {
    setSelectedFinancier(lead?.financier_name || '');
    setShowReapplyModal(true);
  };

  const handleConvertToLoan = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/loan-drafts/lead/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (response.ok) {
        const draft = await response.json();
        sessionStorage.setItem('loan_draft_data', JSON.stringify(draft));
        navigate(`/create-loan?leadId=${id}&hasDraft=true`);
      } else {
        navigate(`/create-loan?leadId=${id}`);
      }
    } catch (error) {
      navigate(`/create-loan?leadId=${id}`);
    }
  };

  const handleConfirmReapply = () => {
    const selectedBank = banks.find(bank => bank.name === selectedFinancier);
    cloneMutation.mutate(selectedBank?.id);
  };

  const handleShareLead = async () => {
    const message = `*Finonest India - Lead Information*

Customer: ${lead.customer_name}
Phone: ${lead.phone}
Vehicle: ${lead.vehicle_number || 'Not specified'}
Loan Required: ₹${Number(lead.loan_amount_required || 0).toLocaleString()}
Financier: ${lead.financier_name || lead.bank_name || 'Not specified'}
Status: ${lead.application_stage ? STAGE_LABELS[lead.application_stage as ApplicationStage] : 'Submitted'}

For more details, contact Finonest India team.

Thank you,
Finonest India`;

    await shareContent({
      title: 'Lead Information',
      text: message
    });
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  const labelClass = "block text-xs font-medium text-foreground/70 mb-1";

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  if (error) {
    console.error('Lead detail error:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-background border border-dashed border-border rounded-xl mt-6">
        <p className="text-red-500 font-medium mb-2">Error loading lead details</p>
        <p className="text-muted-foreground text-sm mb-4">{(error as Error).message}</p>
        <button 
          onClick={() => navigate('/leads-list')} 
          className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-all duration-200"
        >
          <ArrowLeft size={16} /> Back to leads
        </button>
      </div>
    );
  }

  if (!lead) {
    console.log('No lead data found for ID:', id);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-background border border-dashed border-border rounded-xl mt-6">
        <p className="text-muted-foreground font-medium mb-4">Lead not found (ID: {id})</p>
        <p className="text-xs text-muted-foreground mb-4">Check if the lead exists or if you have permission to view it</p>
        <button 
          onClick={() => navigate('/leads-list')} 
          className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-all duration-200"
        >
          <ArrowLeft size={16} /> Back to leads
        </button>
      </div>
    );
  }

  const Field = ({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) => (
    <div className="min-w-0 bg-background/30 p-4 rounded-xl border border-border transition-all duration-300">
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon size={14} className="text-muted-foreground/80" />}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-bold text-foreground break-words">{value || '—'}</p>
    </div>
  );

  return (
    <>
     

    <div className="max-w-5xl mx-auto pb-24">

      {/* Mobile sticky header + actions — portaled to escape overflow container */}
      {createPortal(
        <div className="lg:hidden fixed top-12 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm rounded-b-2xl">
          {/* Row 1: back + name + stage */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => navigate('/leads-list')} className="p-1.5 bg-muted/50 rounded-lg shrink-0">
                <ArrowLeft size={16} className="text-primary" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate leading-tight">{lead.customer_name}</p>
                <p className="text-[10px] text-muted-foreground">{lead.customer_id}</p>
              </div>
            </div>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold border ${
              lead.application_stage ? STAGE_COLORS[lead.application_stage as ApplicationStage] : 'bg-primary/10 text-primary border-primary/20'
            }`}>
              {lead.application_stage ? STAGE_LABELS[lead.application_stage as ApplicationStage] : 'Submitted'}
            </span>
          </div>
          {/* Row 2: action buttons */}
          <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide">
            <a href={`tel:${lead.phone}`} className="shrink-0 flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-secondary to-primary text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all border border-white/20">
              <Phone size={14} />
              Call
            </a>
            <button onClick={handleShareLead} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold whitespace-nowrap">
              <Share2 size={14} />
              Share
            </button>
            <button onClick={handleReapply} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border">
              Reapply
            </button>
            {lead.is_converted_to_loan && lead.loan_application_status && (
              <button
                onClick={() => navigate(`/loans/${lead.loan_application_status.loan_id}`)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold whitespace-nowrap"
              >
                <ExternalLink size={12} /> View Loan
              </button>
            )}
            <button onClick={() => navigate('/add-lead')} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-accent text-accent-foreground rounded-xl text-xs font-bold whitespace-nowrap">
              New Lead
            </button>
            {user?.role === 'executive' && (
              <span className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted/50 text-muted-foreground rounded-xl text-xs font-medium whitespace-nowrap border border-border">
                Contact manager to update status
              </span>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Spacer for sticky header height on mobile */}
      <div className="lg:hidden h-[88px]" />

      <div className="hidden lg:flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/leads-list')} 
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/50"
        >
          <ArrowLeft size={18} /> Back to Leads
        </button>
        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/60 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="opacity-60 uppercase tracking-tighter">Reference:</span>
            <span className="font-bold">{id}</span>
          </div>
          <div className="h-4 w-px bg-white/40 mx-2"></div>
          <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border ${
            lead.application_stage 
              ? STAGE_COLORS[lead.application_stage as ApplicationStage] 
              : 'bg-primary/10 text-primary border-primary/20'
          }`}>
            {lead.application_stage ? STAGE_LABELS[lead.application_stage as ApplicationStage] : 'Submitted'}
          </span>
        </div>
      </div>

      {/* Converted Loan File Banner */}
      {lead.is_converted_to_loan && lead.loan_application_status && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-emerald-100 rounded-xl shrink-0">
              <FileText size={18} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-800">Loan File Created</p>
              <p className="text-xs text-emerald-600 truncate">
                {lead.loan_application_status.loan_number || `Loan #${lead.loan_application_status.loan_id}`} &nbsp;•&nbsp;
                Stage: <span className="font-semibold">{lead.loan_application_status.label}</span>
                {lead.loan_application_status.loan_amount && (
                  <> &nbsp;•&nbsp; {formatCurrency(Number(lead.loan_application_status.loan_amount))}</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/loans/${lead.loan_application_status.loan_id}`)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
          >
            <ExternalLink size={13} /> View Loan
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <User size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Customer Profile</h3>
              <p className="text-xs text-muted-foreground font-medium">Personal & Contact Info</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Customer Name" value={lead.customer_name} icon={User} />
            <Field label="Phone Number" value={lead.phone} icon={User} />
            <Field label="PAN Number" value={lead.pan_number} icon={FileText} />
            <Field label="Email" value={lead.email} icon={FileText} />
            <div className="col-span-2"><Field label="Current Address" value={lead.current_address} icon={FileText} /></div>
            <Field label="Landmark" value={lead.current_landmark} icon={FileText} />
            <Field label="Pincode" value={lead.pincode} icon={FileText} />
            <Field label="City" value={lead.city} icon={Car} />
            <Field label="State" value={lead.state} icon={Car} />
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Car size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Vehicle Information</h3>
              <p className="text-xs text-muted-foreground font-medium">Asset Details</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle Number" value={lead.vehicle_number} icon={Car} />
            <Field label="Case Type" value={lead.case_type?.replace(/_/g, ' ')} icon={Car} />
            <Field label="Lead Type" value={lead.lead_type?.replace(/_/g, ' ')} icon={Car} />
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <IndianRupee size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Financial Summary</h3>
              <p className="text-xs text-muted-foreground font-medium">Requirement & Banker</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Loan Amount Required" value={lead.loan_amount_required ? formatCurrency(Number(lead.loan_amount_required)) : '—'} icon={IndianRupee} />
            <Field label="Preferred Financier" value={lead.financier_name || lead.bank_name} icon={FileText} />
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Application Flow</h3>
              <p className="text-xs text-muted-foreground font-medium">Current Processing Stage</p>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background">
            <ApplicationStageDisplay
              currentStage={(lead.application_stage as ApplicationStage) || 'SUBMITTED'}
              stageHistory={lead.stage_history || []}
              onEditStage={() => setShowStageModal(true)}
              canEdit={user?.role === 'admin'}
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Administrative Metadata</h3>
              <p className="text-xs text-muted-foreground font-medium">System Tracking & Audit</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Branch" value={lead.our_branch} icon={FileText} />
            <Field label="Lead Source" value={lead.lead_type?.replace(/_/g, ' ')} icon={FileText} />
            <Field label="Assigned Rep" value={lead.assigned_to_name} icon={User} />
            <Field label="Follow Up" value={lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString('en-IN') : 'None'} icon={FileText} />
            <Field label="Created On" value={lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '—'} icon={FileText} />
            <Field label="Last Updated" value={lead.updated_at ? new Date(lead.updated_at).toLocaleDateString('en-IN') : '—'} icon={FileText} />
            <div className="md:col-span-2"><Field label="Notes" value={lead.notes} icon={FileText} /></div>
          </div>
        </div>
      </div>

      {/* Stage Update Modal */}
      {showStageModal && (
        <ApplicationStageModal
          isOpen={true}
          onClose={() => setShowStageModal(false)}
          currentStage={(lead.application_stage as ApplicationStage) || 'SUBMITTED'}
          leadId={Number(id)}
          onStageUpdate={handleStageUpdate}
        />
      )}

      <div className="mt-8 space-y-8 pb-20">
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight leading-none mb-1">Document Management</h3>
              <p className="text-xs text-muted-foreground font-medium">Upload & Review Documents</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1">
              <DocumentUpload leadId={Number(id)} />
            </div>
            <div className="lg:col-span-2">
              <DocumentList leadId={Number(id)} />
            </div>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}
