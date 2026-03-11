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
      <div className="text-center py-20">
        <p className="text-muted-foreground">Lead not found</p>
        <button onClick={() => navigate('/leads-list')} className="mt-4 text-accent hover:underline text-sm">← Back to leads</button>
      </div>
    );
  }

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground break-words">{value || '—'}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4">
      <button onClick={() => navigate('/leads-list')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Leads
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{lead.customer_id}</h1>
            {lead.converted_to_loan ? (
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Converted</span>
            ) : (
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Active</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{lead.customer_name}</p>
        </div>
        {!lead.converted_to_loan && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => cloneMutation.mutate()}
              disabled={cloneMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Copy size={16} />
              {cloneMutation.isPending ? 'Working...' : 'Reapply / Clone'}
            </button>
            <button
              onClick={() => navigate(`/loans/new?leadId=${lead.id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <ArrowRight size={16} />
              Convert to Loan
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent"><User size={18} /></span>
            <h3 className="text-sm font-semibold text-foreground">Customer Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
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

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent"><Car size={18} /></span>
            <h3 className="text-sm font-semibold text-foreground">Vehicle Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle Number" value={lead.vehicle_number || lead.vehicle_no} />
            <Field label="Case Type" value={lead.case_type} />
            <Field label="Lead Type" value={lead.lead_type} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent"><IndianRupee size={18} /></span>
            <h3 className="text-sm font-semibold text-foreground">Loan Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Loan Amount Required" value={lead.loan_amount_required ? formatCurrency(Number(lead.loan_amount_required)) : '—'} />
            <Field label="Financier" value={lead.financier_name} />
            <Field label="Stage" value={lead.stage} />
            <Field label="Status" value={lead.status} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent"><User size={18} /></span>
            <h3 className="text-sm font-semibold text-foreground">Other Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
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

      {/* Dynamic PRD Loan Application Info (Customer Profiling) */}
      <div className="mt-4 mb-4 pt-2">
        <CustomerProfileForm leadId={Number(id)} />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Document Upload Component */}
        <DocumentUpload leadId={Number(id)} />

        {/* Document List Component */}
        <div className="min-h-[250px]">
          <DocumentList leadId={Number(id)} />
        </div>
      </div>
    </div>
  );
}
