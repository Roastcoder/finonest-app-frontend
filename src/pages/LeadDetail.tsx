import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, Car, IndianRupee, ArrowRight, FileText, Copy, X, ClipboardCheck, Share2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/mock-data';
import { FINANCIERS } from '@/lib/financiers';
import DocumentUpload, { DocumentList } from '@/components/DocumentUpload';
import ApplicationStageDisplay from '@/components/ApplicationStageDisplay';
import ApplicationStageModal from '@/components/ApplicationStageModal';
import { ApplicationStage, ApplicationStageData, STAGE_LABELS, STAGE_COLORS } from '@/types/applicationStages';
import { shareContent } from '@/lib/native-share';
import MobileNavbarWrapper from '@/components/MobileNavbarWrapper';

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
    <MobileNavbarWrapper title={lead?.customer_name || 'Lead Details'} showTimeline={false} showExport={false} showNotifications={true} showProfile={true}>
      <div className="max-w-5xl mx-auto pb-24">

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
    </MobileNavbarWrapper>
  );
}
