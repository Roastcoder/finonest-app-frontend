import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { ArrowLeft, User, Car, IndianRupee, ArrowRight, FileText, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/mock-data';
import DocumentUpload, { DocumentList } from '@/components/DocumentUpload';
import CustomerProfileForm from '@/components/CustomerProfileForm';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        if (!response.ok) throw new Error('Lead not found');
        return await response.json();
      } catch (error) {
        throw error;
      }
    },
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const cloneMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({}) // Can pass new_financier_id if desired
      });
      if (!response.ok) throw new Error('Failed to clone lead');
      return await response.json();
    },
    onSuccess: (data) => {
      toast.success('Lead successfully cloned for reapplication!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate(`/leads/${data.leadId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error cloning lead');
    }
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-background border border-dashed border-border rounded-xl mt-6">
        <p className="text-muted-foreground font-medium mb-4">Lead not found</p>
        <button 
          onClick={() => navigate('/leads-list')} 
          className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-all duration-200"
        >
          <ArrowLeft size={16} /> Back to leads
        </button>
      </div>
    );
  }

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0 bg-muted/20 p-3 rounded-lg border border-border/40 hover:border-accent/20 transition-colors">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground break-words">{value || '—'}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4">
      <button onClick={() => navigate('/leads-list')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Leads
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-card p-5 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{lead.customer_id}</h1>
            {lead.converted_to_loan ? (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Converted
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Active
              </span>
            )}
          </div>
          <p className="text-base font-medium text-muted-foreground mt-2 flex items-center gap-2">
            <User size={16} className="text-accent" /> {lead.customer_name}
          </p>
        </div>
        {!lead.converted_to_loan && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => cloneMutation.mutate()}
              disabled={cloneMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-border bg-background text-sm font-semibold text-foreground hover:border-accent/50 hover:bg-accent/5 transition-all duration-200 disabled:opacity-50"
            >
              <Copy size={16} className={cloneMutation.isPending ? "animate-pulse" : ""} />
              {cloneMutation.isPending ? 'Working...' : 'Reapply / Clone'}
            </button>
            <button
              onClick={() => navigate(`/loans/new?leadId=${lead.id}`)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent/90 text-white text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              Convert to Loan
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border/40">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <User size={20} />
            </div>
            <h3 className="text-base font-bold text-foreground">Customer Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer ID" value={lead.customer_id} />
            <Field label="Customer Name" value={lead.customer_name} />
            <Field label="Phone Number" value={lead.phone || lead.phone_no} />
            <Field label="PAN Number" value={lead.pan_number} />
            <Field label="City" value={lead.city || lead.district} />
            <Field label="State" value={lead.state} />
            <Field label="Pin Code" value={lead.pincode} />
            <div className="col-span-2"><Field label="Email" value={lead.email} /></div>
            <div className="col-span-2"><Field label="Address" value={lead.current_address} /></div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border/40">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
              <Car size={20} />
            </div>
            <h3 className="text-base font-bold text-foreground">Vehicle Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle Number" value={lead.vehicle_number || lead.vehicle_no} />
            <Field label="Case Type" value={lead.case_type} />
            <div className="col-span-2"><Field label="Lead Type" value={lead.lead_type} /></div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border/40">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
              <IndianRupee size={20} />
            </div>
            <h3 className="text-base font-bold text-foreground">Loan Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loan Amount Required" value={lead.loan_amount_required ? formatCurrency(Number(lead.loan_amount_required)) : '—'} />
            <Field label="Financier" value={lead.financier_name} />
            <Field label="Stage" value={lead.stage} />
            <Field label="Status" value={lead.status} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border/40">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <FileText size={20} />
            </div>
            <h3 className="text-base font-bold text-foreground">Other Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Our Branch" value={lead.our_branch} />
            <Field label="Source" value={lead.source} />
            <Field label="Assigned To" value={lead.assigned_to_name} />
            <Field label="Follow Up Date" value={lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString('en-IN') : '—'} />
            <Field label="Created" value={new Date(lead.created_at).toLocaleDateString('en-IN')} />
            <Field label="Last Updated" value={new Date(lead.updated_at).toLocaleDateString('en-IN')} />
            <div className="col-span-2"><Field label="Notes" value={lead.notes} /></div>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-6">
        <CustomerProfileForm leadId={Number(id)} />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        {/* Document Upload Component */}
        <div className="w-full">
          <DocumentUpload leadId={Number(id)} />
        </div>

        {/* Document List Component */}
        <div className="w-full min-h-[300px]">
          <DocumentList leadId={Number(id)} />
        </div>
      </div>
    </div>
  );
}
