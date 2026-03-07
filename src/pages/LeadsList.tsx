import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, ArrowRight, Copy, Check, Eye, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const deleteLead = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete lead');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete lead');
    },
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });

  const filtered = leads.filter((l: any) => {
    // DSA leads only visible to admin
    if (l.created_by_role === 'dsa' && user?.role !== 'admin') {
      return false;
    }
    
    return !search ||
      l.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone_no?.includes(search);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} leads found</p>
        </div>
        <Link to="/add-lead" className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
          <Plus size={16} /> Add Lead
        </Link>
      </div>

      <div className="stat-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="stat-card overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading leads…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground hidden md:table-cell">Vehicle</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Loan Amount</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground hidden sm:table-cell">Branch</th>
                  <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="py-3 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead: any) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => {
                          if (lead.customer_id) {
                            navigator.clipboard.writeText(lead.customer_id);
                            setCopiedId(lead.customer_id);
                            toast.success('Customer ID copied!');
                            setTimeout(() => setCopiedId(null), 2000);
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs font-mono text-accent hover:text-accent/80 transition-colors group"
                        title="Click to copy"
                      >
                        <span>{lead.customer_id || '—'}</span>
                        {lead.customer_id && (
                          copiedId === lead.customer_id ?
                            <Check size={12} className="text-green-600" /> :
                            <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-foreground">{lead.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.district}</p>
                    </td>
                    <td className="py-3 px-3 text-foreground">{lead.phone_no}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{lead.vehicle_no || '—'}</td>
                    <td className="py-3 px-3 text-right font-medium text-foreground">₹{Number(lead.loan_amount_required || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden sm:table-cell">{lead.our_branch || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      {lead.converted_to_loan ? (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Converted</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors"
                          title="View Lead"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/loans/new?leadId=${lead.id}`)}
                          className="p-1.5 rounded-lg hover:bg-accent/10 text-accent transition-colors"
                          title="Convert to Loan"
                        >
                          <ArrowRight size={16} />
                        </button>
                        {(user?.role === 'admin') && (
                          <button
                            onClick={() => setDeleteConfirm(lead.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="py-12 text-center text-muted-foreground">No leads found</div>
            )}
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Delete Lead</h3>
                <p className="text-sm text-muted-foreground mt-1">Are you sure you want to delete this lead?</p>
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded-lg hover:bg-muted">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteLead.mutate(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
