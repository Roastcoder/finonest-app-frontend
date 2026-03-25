import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, APPLICATION_STAGES, ApplicationStage } from '@/lib/mock-data';
import { exportToCSV, parseCSV } from '@/lib/export-utils';
import { exportLoanPDF, downloadLoanPDF } from '@/lib/pdf-export';
import { toast } from 'sonner';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import LoanApplicationStageManager from '@/components/LoanApplicationStageManager';
import { Search, Plus, ChevronRight, Download, Upload, Printer, MessageCircle, Edit2, Trash2, Settings } from 'lucide-react';

type ApplicationStageFilter = ApplicationStage | 'all';

export default function Loans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStageFilter>('all');
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [showStageManager, setShowStageManager] = useState(false);
  const [sharingLoanId, setSharingLoanId] = useState<string | null>(null);
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

  const handleStageUpdate = (loan: any) => {
    setSelectedLoan(loan);
    setShowStageManager(true);
  };

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

  const handleShareLoan = async (loan: any) => {
    const loanId = String(loan.id);
    setSharingLoanId(loanId);

    try {
      const docs = await api.get(`/loans/${loan.id}/documents`);
      const uniqueDocs = docs.filter((doc: any, index: number, self: any[]) => {
        const firstIndex = self.findIndex(d =>
          d.document_type === doc.document_type &&
          d.file_name === doc.file_name
        );
        return index === firstIndex;
      });

      const { shareLoanPDF } = await import('@/lib/pdf-export');
      await shareLoanPDF(loan, uniqueDocs);
    } catch (error: any) {
      console.error('Share loan error:', error);
      toast.error(error?.message || 'Failed to share loan application');
    } finally {
      setSharingLoanId(current => current === loanId ? null : current);
    }
  };

  const canEditStatus = true; // all roles can change stage
  const isTeamLeader = user?.role === 'team_leader';
  const canDelete = user?.role === 'admin';
  
  const showUpdateColumn = true;

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
      l.id?.toString().toLowerCase().includes(search.toLowerCase()) ||
      l.loan_number?.toLowerCase().includes(search.toLowerCase()) ||
      l.mobile?.toLowerCase().includes(search.toLowerCase()) ||
      l.bank_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.financier_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.car_make?.toLowerCase().includes(search.toLowerCase()) ||
      l.car_model?.toLowerCase().includes(search.toLowerCase()) ||
      l.maker_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.model_variant_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
      l.sourcing_person_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.case_type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.application_stage === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="pb-24 lg:pb-0">
      <div className="hidden sm:flex flex-row items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h1 className="text-base sm:text-2xl font-bold text-foreground leading-tight truncate">Loan Applications</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 whitespace-nowrap">{filtered.length} applications found</p>
        </div>
        {/* Desktop buttons only — mobile has sticky toolbar */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button onClick={handleExport} className="flex items-center gap-2 bg-muted text-foreground font-medium py-2.5 px-4 rounded-xl hover:bg-muted/80 transition-opacity text-sm whitespace-nowrap">
            <Download size={16} /> Export
          </button>
          <button onClick={() => importRef.current?.click()} className="flex items-center gap-2 bg-muted text-foreground font-medium py-2.5 px-4 rounded-xl hover:bg-muted/80 transition-opacity text-sm whitespace-nowrap">
            <Upload size={16} /> Import CSV
          </button>
          <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Link to="/loans/new" className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary to-primary text-white font-bold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all text-sm border border-white/20 whitespace-nowrap">
            <Plus size={16} /> New Application
          </Link>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden sm:flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStatusFilter('all')} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${statusFilter === 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>All</button>
          {APPLICATION_STAGES.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value as ApplicationStageFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${statusFilter === s.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Mobile sticky toolbar — sticks below header on scroll */}
      <div className="sm:hidden sticky -top-4 z-40 bg-background/95 backdrop-blur-md border border-border shadow-sm px-3 pt-2 pb-2 space-y-2 -mx-2 mb-4 rounded-b-2xl -mt-4">
          {/* Title row */}
          <div className="flex items-center justify-between py-1">
            <h1 className="text-base font-bold text-foreground">Loan Applications</h1>
            <span className="text-xs text-muted-foreground">{filtered.length} found</span>
          </div>
          {/* Row 1: buttons */}
          <div className="flex items-center gap-1.5">
            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1 bg-muted text-foreground font-semibold py-2 rounded-xl text-xs whitespace-nowrap">
              <Download size={13} /> Export
            </button>
            <button onClick={() => importRef.current?.click()} className="flex-1 flex items-center justify-center gap-1 bg-muted text-foreground font-semibold py-2 rounded-xl text-xs whitespace-nowrap">
              <Upload size={13} /> Import CSV
            </button>
            <Link to="/loans/new" className="flex-1 inline-flex items-center justify-center gap-1 bg-gradient-to-r from-secondary to-primary text-white font-bold py-2 rounded-xl text-xs shadow-md active:scale-95 transition-all border border-white/20 whitespace-nowrap">
              <Plus size={13} /> New Application
            </Link>
          </div>
          {/* Row 2: search + filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ApplicationStageFilter)}
              className="shrink-0 px-2 py-2 rounded-xl border border-border bg-card text-xs font-medium text-foreground focus:outline-none focus:border-accent transition-all">
              <option value="all">All</option>
              {APPLICATION_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
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
              className="bg-card w-full shadow-sm hover:shadow-md border border-border/50 rounded-2xl overflow-hidden p-5 active:scale-[0.99] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-lg tracking-tight truncate">{loan.applicant_name}</p>
                  <p className="text-xs font-semibold text-primary/70 bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md inline-block mt-2 font-mono">{loan.loan_number || loan.id}</p>
                </div>
                <LoanStatusBadge applicationStage={loan.application_stage} applicationStageLabel={loan.application_stage_label} />
              </div>
              <div className="grid grid-cols-2 gap-4 py-3 border-y border-border">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Amount</p>
                  <p className="font-bold text-foreground text-base">{formatCurrency(Number(loan.loan_amount))}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Bank</p>
                  <p className="font-medium text-foreground truncate">{loan.bank_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Case Type</p>
                  <p className="font-medium text-foreground truncate">{loan.case_type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Sourcing</p>
                  <p className="font-medium text-foreground truncate">{loan.sourcing_person_name || '—'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                {/* Action buttons row */}
                <div className="flex items-center gap-2">
                  {user?.role !== 'executive' && (
                    <button
                      onClick={() => navigate(`/loans/edit/${loan.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-blue-500/10 transition-colors"
                    >
                      <Edit2 size={14} className="text-blue-500" /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleShareLoan(loan)}
                    disabled={sharingLoanId === String(loan.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-green-500/10 transition-colors">
                    <MessageCircle size={14} className="text-green-500" />
                    {sharingLoanId === String(loan.id) ? 'Sharing…' : 'Share'}
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(loan)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
                {/* Status update row */}
                {showUpdateColumn && (
                  <button
                    onClick={() => handleStageUpdate(loan)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-1 rounded-lg border border-border bg-muted/30 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors"
                  >
                    <Settings size={14} /> Update Stage
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View — only on lg+ screens */}
      <div className="stat-card max-lg:hidden" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'auto' }}>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading applications…</div>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Loan ID</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Applicant</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Vehicle</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Case Type</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Bank</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Sourcing</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Amount</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Stage</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Actions</th>
                  {showUpdateColumn && (
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">Update</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan: any) => (
                  <tr key={loan.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/loans/${loan.id}`)}>
                    <td className="py-2 px-2 font-mono text-xs text-primary font-semibold whitespace-nowrap">{loan.loan_number || loan.id}</td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <p className="font-medium text-foreground text-xs">{loan.applicant_name}</p>
                      <p className="text-[10px] text-muted-foreground">{loan.mobile}</p>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <p className="text-foreground text-xs">{loan.maker_name || loan.car_make} {loan.model_variant_name || loan.car_model}</p>
                      <p className="text-[10px] text-muted-foreground">{loan.vehicle_number || loan.car_variant}</p>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap text-xs">{loan.case_type || '—'}</td>
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap text-xs">{loan.bank_name || '—'}</td>
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap text-xs">{loan.sourcing_person_name || '—'}</td>
                    <td className="py-2 px-2 text-right font-medium text-foreground whitespace-nowrap text-xs">{formatCurrency(Number(loan.loan_amount))}</td>
                    <td className="py-2 px-2 whitespace-nowrap"><LoanStatusBadge applicationStage={loan.application_stage} applicationStageLabel={loan.application_stage_label} /></td>
                    <td className="py-2 px-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => exportLoanPDF(loan)}
                          className="p-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 transition-colors"
                          title="Export PDF"
                        >
                          <Printer size={11} className="text-accent" />
                        </button>
                        <button
                          onClick={() => handleShareLoan(loan)}
                          disabled={sharingLoanId === String(loan.id)}
                          className="p-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-green-500/10 transition-colors" title="Share PDF with Details">
                          <MessageCircle size={11} className="text-green-500" />
                        </button>
                        {user?.role !== 'executive' && (
                          <button
                            onClick={() => navigate(`/loans/edit/${loan.id}`)}
                            className="p-1 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-blue-500/10 transition-colors" title="Edit Loan">
                            <Edit2 size={11} className="text-blue-500" />
                          </button>
                        )}
                      </div>
                    </td>
                    {showUpdateColumn && (
                      <td className="py-2 px-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStageUpdate(loan)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card text-[10px] font-medium text-foreground hover:bg-accent/10 transition-colors"
                        >
                          <Settings size={11} /> Update
                        </button>
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
      
      {/* Loan Application Stage Manager Modal */}
      <LoanApplicationStageManager
        loan={selectedLoan}
        isOpen={showStageManager}
        onClose={() => {
          setShowStageManager(false);
          setSelectedLoan(null);
        }}
      />
    </div>
  );
}
