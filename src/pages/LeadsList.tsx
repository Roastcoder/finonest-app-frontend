import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, ArrowRight, Copy, Check, Eye, Trash2, X, Edit, Filter, Users, ClipboardCheck, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import ApplicationStageModal from '@/components/ApplicationStageModal';
import { ApplicationStage, ApplicationStageData, STAGE_LABELS, STAGE_COLORS } from '@/types/applicationStages';

export default function LeadsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [stageModal, setStageModal] = useState<{ leadId: number; currentStage: ApplicationStage } | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const queryClient = useQueryClient();

  const handleStageUpdate = (leadId: number, stageData: ApplicationStageData) => {
    // Update the lead in the cache
    queryClient.setQueryData(['leads'], (oldData: any) => {
      if (!oldData) return oldData;
      return oldData.map((lead: any) => 
        lead.id === leadId 
          ? { ...lead, application_stage: stageData.stage, stage_data: stageData }
          : lead
      );
    });
    setStageModal(null);
  };

  const deleteLead = useMutation({
    mutationFn: (id: number) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete lead');
    },
  });

  const { data: leads = [], isLoading, error: leadsError } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads'),
    enabled: !!user,
  });

  const filtered = leads.filter((l: any) => {
    // Hide converted leads for all roles
    if (l.converted_to_loan) return false;

    // Branch filter
    if (filterBranch !== 'all' && l.our_branch !== filterBranch) return false;

    // Stage filter
    if (filterStage !== 'all' && l.application_stage !== filterStage) return false;

    // Executives can only see their own leads
    if (user?.role === 'executive' && l.created_by !== user?.id) return false;

    return !search ||
      l.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.customer_id?.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: filtered.length,
    pending: filtered.filter((l: any) => !['DISBURSED', 'REJECTED', 'CANCELLED'].includes(l.application_stage)).length,
    converted: filtered.filter((l: any) => l.converted_to_loan).length
  };

  const branches = Array.from(new Set(leads.map((l: any) => l.our_branch).filter(Boolean))) as string[];

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview and status of all customer leads</p>
        </div>
        <Link to="/add-lead" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 px-6 rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl active:scale-95 text-sm">
          <Plus size={18} /> Add New Lead
        </Link>
      </div>

      <div className={`grid gap-2 lg:gap-6 mb-6 ${user?.role === 'executive' ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <div className="stat-card p-2 md:p-4 border-none bg-blue-50 hover:-translate-y-1 transition-transform flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center gap-1 md:gap-2 mb-1">
            <Users size={16} className="text-blue-600 md:size-5" />
            <p className="text-[10px] md:text-sm font-semibold text-blue-800/70 leading-tight">Total<br className="md:hidden" /> Leads</p>
          </div>
          <h3 className="text-lg md:text-2xl font-bold text-blue-900 tracking-tight leading-none">{stats.total}</h3>
        </div>

        <div className="stat-card p-2 md:p-4 border-none bg-orange-50 hover:-translate-y-1 transition-transform flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center gap-1 md:gap-2 mb-1">
            <ClipboardCheck size={16} className="text-orange-600 md:size-5" />
            <p className="text-[10px] md:text-sm font-semibold text-orange-800/70 leading-tight">Pending<br className="md:hidden" /> Action</p>
          </div>
          <h3 className="text-lg md:text-2xl font-bold text-orange-900 tracking-tight leading-none">{stats.pending}</h3>
        </div>

        {user?.role !== 'executive' && (
          <div className="stat-card p-2 md:p-4 border-none bg-emerald-50 hover:-translate-y-1 transition-transform flex flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center gap-1 md:gap-2 mb-1">
              <TrendingUp size={16} className="text-emerald-600 md:size-5" />
              <p className="text-[10px] md:text-sm font-semibold text-emerald-800/70 leading-tight">Converted</p>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-emerald-900 tracking-tight leading-none">{stats.converted}</h3>
          </div>
        )}
      </div>

      <div className="glass-panel p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, phone or lead ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                isFilterOpen || filterBranch !== 'all' || filterStage !== 'all'
                  ? 'bg-accent/10 border-accent/20 text-accent'
                  : 'border-border bg-background/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Filter size={18} />
              Filters
              {(filterBranch !== 'all' || filterStage !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              )}
            </button>
            {(search || filterBranch !== 'all' || filterStage !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterBranch('all');
                  setFilterStage('all');
                }}
                className="p-2.5 rounded-xl border border-border bg-background/50 text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                title="Clear all filters"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {isFilterOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Branch</label>
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition-all"
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Application Stage</label>
              <select
                value={filterStage}
                onChange={e => setFilterStage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition-all"
              >
                <option value="all">All Stages</option>
                {Object.entries(STAGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {leadsError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Error loading leads: {(leadsError as Error).message}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading leads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center glass-panel">
            <div className="mb-4 flex justify-center text-muted-foreground/30">
              <Users size={48} />
            </div>
            <p className="text-foreground font-semibold">No leads found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          filtered.map((lead: any) => (
            <div
              key={lead.id}
              className="bg-card w-full shadow-sm hover:shadow-md border border-border/50 rounded-2xl overflow-hidden active:scale-[0.99] transition-all duration-200"
              onClick={() => navigate(`/leads/${lead.id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/10">{lead.customer_id || 'NO-ID'}</span>
                      {lead.converted_to_loan && (
                        <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-500/20">Converted</span>
                      )}
                    </div>
                    <p className="font-bold text-foreground text-lg tracking-tight mb-1 truncate">{lead.customer_name}</p>
                    <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                      <span>{lead.phone}</span>
                      {lead.city && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                          <span className="opacity-80">{lead.city}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {lead.converted_to_loan ? (
                      <span className="shrink-0 text-xs px-3 py-1 rounded-full font-semibold shadow-sm border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                        Converted
                      </span>
                    ) : (
                      <span className={`shrink-0 text-xs px-3 py-1 rounded-full font-semibold shadow-sm border ${
                        lead.application_stage 
                          ? STAGE_COLORS[lead.application_stage as ApplicationStage] 
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {lead.application_stage ? STAGE_LABELS[lead.application_stage as ApplicationStage] : 'Submitted'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Req. Amount</p>
                    <p className="font-bold text-foreground text-base">₹{Number(lead.loan_amount_required || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Reg. Number</p>
                    <p className="font-bold text-foreground text-base truncate uppercase">{lead.vehicle_number || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-muted-foreground font-medium">{lead.our_branch || 'Direct Branch'}</span>
                  <span className="text-muted-foreground font-medium">{new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 divide-x divide-border/30 bg-muted/30 border-t border-border/30" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="py-3 flex items-center justify-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                >
                  <Eye size={14} /> View
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setStageModal({ leadId: lead.id, currentStage: (lead.application_stage as ApplicationStage) || 'SUBMITTED' })}
                    className="py-3 flex items-center justify-center gap-2 text-xs font-bold text-primary/70 hover:bg-primary/5 transition-colors"
                  >
                    <Edit size={14} /> Stage
                  </button>
                )}
                {!lead.converted_to_loan && user?.role !== 'executive' ? (
                  <button
                    onClick={() => navigate(`/loans/new?leadId=${lead.id}`)}
                    className="py-3 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <ArrowRight size={14} /> Convert
                  </button>
                ) : lead.converted_to_loan ? (
                  <div className="py-3 flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground opacity-50 bg-muted/50">
                    <Check size={14} /> Done
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="glass-panel overflow-hidden max-lg:hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading leads...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Lead ID</th>
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Customer Info</th>
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Vehicle No.</th>
                  <th className="text-right py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Loan Amount</th>
                  <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Branch</th>
                  <th className="text-center py-4 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Current Stage</th>
                  <th className="py-4 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((lead: any, idx: number) => (
                  <tr key={lead.id} className={`${idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'} hover:bg-accent/5 transition-all group`}>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => {
                          if (lead.customer_id) {
                            navigator.clipboard.writeText(lead.customer_id);
                            setCopiedId(lead.customer_id);
                            toast.success('Lead ID copied!');
                            setTimeout(() => setCopiedId(null), 2000);
                          }
                        }}
                        className="flex items-center gap-2 text-[11px] font-mono text-primary font-semibold hover:text-accent transition-colors bg-muted/50 px-2 py-1 rounded"
                      >
                        <span>{lead.customer_id || '—'}</span>
                        {lead.customer_id && (copiedId === lead.customer_id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="opacity-0 group-hover:opacity-100" />)}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{lead.customer_name}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{lead.phone} {lead.city ? `· ${lead.city}` : ''}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold text-foreground bg-muted/30 px-2 py-1 rounded border border-border/50 uppercase">{lead.vehicle_number || '—'}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-foreground">₹{Number(lead.loan_amount_required || 0).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-muted-foreground font-medium">{lead.our_branch || 'Direct'}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {lead.converted_to_loan ? (
                        <span className="inline-block text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                          Converted
                        </span>
                      ) : (
                        <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm border ${
                          lead.application_stage 
                            ? STAGE_COLORS[lead.application_stage as ApplicationStage] 
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {lead.application_stage ? STAGE_LABELS[lead.application_stage as ApplicationStage] : 'Submitted'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1 px-1">
                        <button 
                          onClick={() => navigate(`/leads/${lead.id}`)} 
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-all hover:scale-110" 
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {user?.role === 'admin' && (
                          <button 
                            onClick={() => setStageModal({ leadId: lead.id, currentStage: (lead.application_stage as ApplicationStage) || 'SUBMITTED' })} 
                            className="p-2 rounded-lg hover:bg-primary/5 text-primary/60 transition-all hover:scale-110" 
                            title="Update Stage"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {!lead.converted_to_loan && user?.role !== 'executive' ? (
                          <button 
                            onClick={() => navigate(`/loans/new?leadId=${lead.id}`)} 
                            className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-all hover:scale-110" 
                            title="Convert to Loan"
                          >
                            <ArrowRight size={18} />
                          </button>
                        ) : lead.converted_to_loan ? (
                          <div className="p-2 text-emerald-600 opacity-50" title="Already converted">
                            <Check size={18} />
                          </div>
                        ) : null}
                        {user?.role === 'admin' && (
                          <button 
                            onClick={() => setDeleteConfirm(lead.id)} 
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-all hover:scale-110" 
                            title="Delete Lead"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="py-20 text-center text-muted-foreground bg-muted/5">
                <Users size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium">No leads match your search criteria</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage Update Modal */}
      {stageModal && (
        <ApplicationStageModal
          isOpen={true}
          onClose={() => setStageModal(null)}
          currentStage={stageModal.currentStage}
          leadId={stageModal.leadId}
          onStageUpdate={(stageData) => handleStageUpdate(stageModal.leadId, stageData)}
        />
      )}

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
