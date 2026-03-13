import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, Car, IndianRupee, ArrowRight, FileText, Copy, X, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/mock-data';
import { FINANCIERS } from '@/lib/financiers';
import DocumentUpload, { DocumentList } from '@/components/DocumentUpload';
import CustomerProfileForm from '@/components/CustomerProfileForm';
import ApplicationStageDisplay from '@/components/ApplicationStageDisplay';
import ApplicationStageModal from '@/components/ApplicationStageModal';
import { ApplicationStage, ApplicationStageData, STAGE_LABELS, STAGE_COLORS } from '@/types/applicationStages';

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
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${id}`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${id}/clone`, {
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
      {/* Reapply Modal */}
      {showReapplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Reapply with New Financier</h3>
              <button 
                onClick={() => setShowReapplyModal(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Select New Financier</label>
                <select 
                  className={inputClass}
                  value={selectedFinancier}
                  onChange={e => setSelectedFinancier(e.target.value)}
                >
                  <option value="">Choose Financier</option>
                  {FINANCIERS.map((financier) => (
                    <option key={financier} value={financier}>
                      {financier}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-muted/20 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Current Financier</p>
                <p className="text-sm font-medium text-foreground">{lead?.financier_name || 'Not specified'}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setShowReapplyModal(false)}
                className="px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmReapply}
                disabled={!selectedFinancier || cloneMutation.isPending}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
              >
                {cloneMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : 'Reapply'}
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="max-w-5xl mx-auto pb-24">
      <div className="sticky top-0 z-40 lg:hidden -mx-4 px-4 py-4 bg-background border-b border-border mb-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/leads-list')} className="p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} className="text-primary" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">{lead.customer_name}</h1>
            <p className="text-xs font-medium text-muted-foreground mt-1">{lead.customer_id}</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold shadow-sm border ${
          lead.application_stage 
            ? STAGE_COLORS[lead.application_stage as ApplicationStage] 
            : 'bg-primary/10 text-primary border-primary/20'
        }`}>
          {lead.application_stage ? STAGE_LABELS[lead.application_stage as ApplicationStage] : 'Submitted'}
        </span>
      </div>

      {/* Desktop Header Actions */}
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

      {/* Mobile Quick Action Bar */}
      <div className="lg:hidden flex gap-3 mb-6 overflow-x-auto no-scrollbar py-2">
        <a href={`tel:${lead.phone}`} className="flex-1 flex flex-col items-center gap-2 p-3 bg-primary text-white rounded-2xl shadow-md active:scale-95 transition-all outline-none">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Call</span>
        </a>
        <a href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center gap-2 p-3 bg-emerald-500 text-white rounded-2xl shadow-md active:scale-95 transition-all outline-none">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">WhatsApp</span>
        </a>
        <button onClick={handleReapply} className="flex-1 flex flex-col items-center gap-2 p-3 bg-background border border-border text-foreground rounded-2xl shadow-sm active:scale-95 transition-all outline-none">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Copy size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Reapply</span>
        </button>
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
            <Field label="Phone Number" value={lead.phone || lead.phone_no} icon={User} />
            <Field label="PAN Number" value={lead.pan_number} icon={FileText} />
            <Field label="City" value={lead.city || lead.district} icon={Car} />
            <Field label="State" value={lead.state} icon={Car} />
            <Field label="Pin Code" value={lead.pincode} icon={FileText} />
            <div className="col-span-2"><Field label="Email" value={lead.email} icon={FileText} /></div>
            <div className="col-span-2"><Field label="Current Address" value={lead.current_address} icon={FileText} /></div>
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
          <div className="grid grid-cols-1 gap-4">
            <Field label="Vehicle Number" value={lead.vehicle_number || lead.vehicle_no} icon={Car} />
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
          <div className="grid grid-cols-1 gap-4">
            <Field label="Loan Amount Requested" value={lead.loan_amount_required ? formatCurrency(Number(lead.loan_amount_required)) : '—'} icon={IndianRupee} />
            <Field label="Proposed Financier" value={lead.financier_name} icon={FileText} />
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
            <Field label="Lead Source" value={lead.source} icon={FileText} />
            <Field label="Assigned Rep" value={lead.assigned_to_name} icon={User} />
            <Field label="Follow Up" value={lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString('en-IN') : 'None'} icon={FileText} />
            <Field label="Created On" value={new Date(lead.created_at).toLocaleDateString('en-IN')} icon={FileText} />
            <Field label="Last Updated" value={new Date(lead.updated_at).toLocaleDateString('en-IN')} icon={FileText} />
            <div className="md:col-span-2"><Field label="Processing Notes" value={lead.notes} icon={FileText} /></div>
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

      <div className="mt-6 mb-6">
        <CustomerProfileForm leadId={Number(id)} />
      </div>

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
