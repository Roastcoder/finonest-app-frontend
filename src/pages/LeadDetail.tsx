import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { ArrowLeft, User, Car, IndianRupee, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/mock-data';

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
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || '—'}</p>
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
          <button
            onClick={() => navigate(`/loans/new?leadId=${lead.id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowRight size={16} />
            Convert to Loan
          </button>
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
            <Field label="Phone Number" value={lead.phone_no} />
            <Field label="District" value={lead.district} />
            <Field label="Tehsil" value={lead.tehsil} />
            <Field label="Pin Code" value={lead.pin_code} />
            <div className="col-span-2"><Field label="Address" value={lead.address} /></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent"><Car size={18} /></span>
            <h3 className="text-sm font-semibold text-foreground">Vehicle Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <Field label="Vehicle Number" value={lead.vehicle_no} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent"><IndianRupee size={18} /></span>
            <h3 className="text-sm font-semibold text-foreground">Loan Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Loan Amount Required" value={lead.loan_amount_required ? formatCurrency(Number(lead.loan_amount_required)) : '—'} />
            <Field label="IRR Requested" value={lead.irr_requested ? `${lead.irr_requested}%` : '—'} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent"><User size={18} /></span>
            <h3 className="text-sm font-semibold text-foreground">Other Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Our Branch" value={lead.our_branch} />
            <Field label="Sourcing Person" value={lead.sourcing_person_name} />
            <Field label="Created" value={new Date(lead.created_at).toLocaleDateString('en-IN')} />
            <Field label="Last Updated" value={new Date(lead.updated_at).toLocaleDateString('en-IN')} />
          </div>
        </div>
      </div>
    </div>
  );
}
