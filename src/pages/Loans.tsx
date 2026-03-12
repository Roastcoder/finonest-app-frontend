import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, LEAD_STATUSES } from '@/lib/mock-data';
import { exportToCSV, parseCSV } from '@/lib/export-utils';
import { exportLoanPDF, shareLoanPDF, downloadLoanPDF } from '@/lib/pdf-export';
import { toast } from 'sonner';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { Search, Plus, ChevronRight, Download, Upload, Printer, MessageCircle, Edit2, Trash2, Eye, Edit } from 'lucide-react';

type LeadStatusFilter = 'new' | 'contacted' | 'documents_collected' | 'in_process' | 'approved' | 'rejected' | 'disbursed' | 'all';

export default function Loans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>('all');
  const importRef = useRef<HTMLInputElement>(null);

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans', user?.branch_id],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteLoan = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete loan');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Loan deleted successfully');
    },
    onError: () => toast.error('Failed to delete loan'),
  });

  const handleDelete = (loan: any) => {
    if (confirm(`Are you sure you want to delete loan ${loan.loan_number || loan.id}?`)) {
      deleteLoan.mutate(loan.id);
    }
  };

  const canEditStatus = user?.role === 'admin' || user?.role === 'manager';
  const isTeamLeader = user?.role === 'team_leader';
  const canDelete = user?.role === 'admin';
  
  // Team leaders should not see update functionality
  const showUpdateColumn = !isTeamLeader && canEditStatus;

  const handleExport = () => {
    if (filtered.length === 0) { toast.error('No data to export'); return; }
    const rows = filtered.map((l: any) => ({
      'Loan ID': l.id, 'Applicant': l.applicant_name, 'Mobile': l.mobile,
      'Vehicle': `${l.car_make || ''} ${l.car_model || ''}`.trim(),
      'Bank': l.banks?.name || '', 'Branch': l.branches?.name || '',
      'Loan Amount': l.loan_amount, 'EMI': l.emi, 'Status': l.status,
    }));
    exportToCSV(rows, 'loans');
    toast.success('Loans exported as CSV!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { toast.error('No valid data found in CSV'); return; }
      let imported = 0;
      for (const row of rows) {
        const id = row['Loan ID'] || `IMP-${Date.now()}-${imported}`;
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            applicant_name: row['Applicant'] || row['applicant_name'] || 'Unknown',
            mobile: row['Mobile'] || row['mobile'] || '0000000000',
            loan_amount: Number(row['Loan Amount'] || row['loan_amount'] || 0),
            car_make: row['Car Make'] || row['car_make'] || '',
            car_model: row['Car Model'] || row['car_model'] || '',
            status: 'new',
            created_by: user.id
          })
        });

        if (response.ok) imported++;
      }
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success(`${imported} loans imported successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    }
    e.target.value = '';
  };

  const filtered = loans.filter((l: any) => {
    const matchSearch = !search ||
      l.applicant_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.id?.toLowerCase().includes(search.toLowerCase()) ||
      l.loan_number?.toLowerCase().includes(search.toLowerCase()) ||
      l.car_model?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loan Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} applications found</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-2 bg-muted text-foreground font-medium py-2.5 px-4 rounded-xl hover:bg-muted/80 transition-opacity text-sm">
            <Download size={16} /> Export
          </button>
          <button onClick={() => importRef.current?.click()} className="flex items-center gap-2 bg-muted text-foreground font-medium py-2.5 px-4 rounded-xl hover:bg-muted/80 transition-opacity text-sm">
            <Upload size={16} /> Import CSV
          </button>
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Link to="/loans/new" className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
            <Plus size={16} /> New Application
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, ID, or car..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>

        {/* Mobile: compact select dropdown */}
        <div className="sm:hidden">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as LeadStatusFilter)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground focus:outline-none focus:border-accent transition-all"
          >
            <option value="all">All Statuses</option>
            {LEAD_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Desktop: pill buttons */}
        <div className="hidden sm:flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >All</button>
          {LEAD_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value as LeadStatusFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${statusFilter === s.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* Mobile Card View — only on screens < lg */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading applications…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No applications found</div>
        ) : (
          filtered.map((loan: any) => (
            <div
              key={loan.id}
              onClick={() => navigate(`/loans/${loan.id}`)}
              className="stat-card active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{loan.applicant_name}</p>
                  <p className="text-xs text-muted-foreground mono">{loan.loan_number || loan.id}</p>
                </div>
                <LoanStatusBadge status={loan.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Amount</p>
                  <p className="font-bold text-foreground">{formatCurrency(Number(loan.loan_amount))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">EMI</p>
                  <p className="font-medium text-foreground">{formatCurrency(Number(loan.emi))}/mo</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Case Type</p>
                  <p className="text-foreground truncate">{loan.case_type || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sourcing</p>
                  <p className="text-foreground truncate">{loan.sourcing_person_name || '—'}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                {/* Action buttons row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Eye size={13} /> View
                  </button>
                  <button
                    onClick={() => navigate(`/loans/${loan.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    onClick={() => exportLoanPDF(loan)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 transition-colors"
                  >
                    <Printer size={13} className="text-accent" /> PDF
                  </button>
                  <button
                    onClick={() => downloadLoanPDF(loan)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 transition-colors"
                  >
                    <Download size={13} className="text-accent" /> Save
                  </button>
                  <button
                    onClick={() => shareLoanPDF(loan)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-green-500/10 transition-colors"
                  >
                    <MessageCircle size={13} className="text-green-500" /> Share
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(loan)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
                {/* Status update row */}
                {showUpdateColumn && (
                  <select
                    value={loan.status}
                    onChange={(e) => updateStatus.mutate({ id: loan.id, status: e.target.value })}
                    disabled={updateStatus.isPending}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground focus:outline-none focus:border-accent"
                  >
                    {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                )}
                {isTeamLeader && (
                  <div className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-xs font-medium text-muted-foreground text-center">
                    Contact manager to update status
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View — only on lg+ screens */}
      <div className="stat-card overflow-x-auto max-lg:hidden">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading applications…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Loan ID</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Applicant</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Vehicle</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Case Type</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Bank</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Sourcing Name</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">EMI</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center py-3 px-3 font-medium text-muted-foreground">Actions</th>
                  {showUpdateColumn && (
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Update</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan: any) => (
                  <tr key={loan.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/loans/${loan.id}`)}>
                    <td className="py-3.5 px-3 mono text-xs text-accent font-medium">{loan.loan_number || loan.id}</td>
                    <td className="py-3.5 px-3">
                      <p className="font-medium text-foreground">{loan.applicant_name}</p>
                      <p className="text-xs text-muted-foreground">{loan.mobile}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="text-foreground">{loan.maker_name || loan.car_make} {loan.model_variant_name || loan.car_model}</p>
                      <p className="text-xs text-muted-foreground">{loan.vehicle_number || loan.car_variant}</p>
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground">{loan.case_type || '—'}</td>
                    <td className="py-3.5 px-3 text-muted-foreground">{loan.bank_name || '—'}</td>
                    <td className="py-3.5 px-3 text-muted-foreground">{loan.sourcing_person_name || '—'}</td>
                    <td className="py-3.5 px-3 text-right font-medium text-foreground">{formatCurrency(Number(loan.loan_amount))}</td>
                    <td className="py-3.5 px-3 text-right text-muted-foreground">{formatCurrency(Number(loan.emi))}/mo</td>
                    <td className="py-3.5 px-3"><LoanStatusBadge status={loan.status} /></td>
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/loans/${loan.id}`)}
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/loans/${loan.id}/edit`)}
                          className="p-1.5 rounded-lg hover:bg-accent/10 text-accent transition-colors"
                          title="Edit Loan"
                        >
                          <Edit size={16} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(loan)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Delete Loan"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                    {showUpdateColumn && (
                      <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={loan.status}
                          onChange={(e) => updateStatus.mutate({ id: loan.id, status: e.target.value })}
                          disabled={updateStatus.isPending}
                          className="px-2 py-1 rounded-md border border-border bg-card text-xs font-medium text-foreground focus:outline-none focus:border-accent"
                        >
                          {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="py-12 text-center text-muted-foreground">No applications found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
