import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, APPLICATION_STAGES, ApplicationStage } from '@/lib/mock-data';
import { exportToCSV, parseCSV } from '@/lib/export-utils';
import { exportLoanPDF, downloadLoanPDF } from '@/lib/pdf-export';
import { shareToCustomer, shareToWhatsAppWithPhone } from '@/lib/whatsapp-share';
import { fetchDocumentFiles } from '@/lib/document-utils';
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
  const [openWhatsAppId, setOpenWhatsAppId] = useState<string | null>(null);
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
          <Link to="/loans/new" className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm whitespace-nowrap">
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
            <Link to="/loans/new" className="flex-1 inline-flex items-center justify-center gap-1 bg-accent text-accent-foreground font-semibold py-2 rounded-xl text-xs whitespace-nowrap">
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
                  <button
                    onClick={() => exportLoanPDF(loan)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <Printer size={14} className="text-accent" /> PDF
                  </button>
                  <button
                    onClick={() => downloadLoanPDF(loan)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <Download size={14} className="text-accent" /> Save
                  </button>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenWhatsAppId(openWhatsAppId === `m-${loan.id}` ? null : `m-${loan.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-green-500/10 transition-colors">
                      <MessageCircle size={14} className="text-green-500" /> Share
                      <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openWhatsAppId === `m-${loan.id}` && (
                      <div className="absolute bottom-full left-0 mb-1 w-40 bg-card border border-border rounded-lg shadow-lg z-20">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setOpenWhatsAppId(null);
                            try {
                              const docsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loan.id}/documents`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                              });
                              const documents = docsResponse.ok ? await docsResponse.json() : [];
                              const docFiles = await fetchDocumentFiles(documents);
                              await shareToCustomer(loan, docFiles.map(d => d.file));
                            } catch (error) {
                              toast.error('Failed to share to customer');
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors border-b border-border"
                        >
                          📱 To Customer
                          <div className="text-muted-foreground text-[10px] mt-0.5">{loan.mobile || 'No phone'}</div>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setOpenWhatsAppId(null);
                            try {
                              const docsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loan.id}/documents`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                              });
                              const documents = docsResponse.ok ? await docsResponse.json() : [];
                              const docFiles = await fetchDocumentFiles(documents);
                              await shareToWhatsAppWithPhone(loan, docFiles.map(d => d.file));
                            } catch (error) {
                              toast.error('Failed to share via WhatsApp');
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors"
                        >
                          📞 Other Number
                          <div className="text-muted-foreground text-[10px] mt-0.5">Enter phone</div>
                        </button>
                      </div>
                    )}
                  </div>
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
      <div className="stat-card overflow-x-auto max-lg:hidden">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading applications…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Loan ID</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Applicant</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Vehicle</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Case Type</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Bank</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Sourcing Name</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Application Stage</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  {showUpdateColumn && (
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Stage Management</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan: any) => (
                  <tr key={loan.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/loans/${loan.id}`)}>
                    <td className="py-3.5 px-3 font-mono text-sm text-primary font-semibold whitespace-nowrap">{loan.loan_number || loan.id}</td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <p className="font-medium text-foreground">{loan.applicant_name}</p>
                      <p className="text-xs text-muted-foreground">{loan.mobile}</p>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <p className="text-foreground">{loan.maker_name || loan.car_make} {loan.model_variant_name || loan.car_model}</p>
                      <p className="text-xs text-muted-foreground">{loan.vehicle_number || loan.car_variant}</p>
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">{loan.case_type || '—'}</td>
                    <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">{loan.bank_name || '—'}</td>
                    <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">{loan.sourcing_person_name || '—'}</td>
                    <td className="py-3.5 px-3 text-right font-medium text-foreground whitespace-nowrap">{formatCurrency(Number(loan.loan_amount))}</td>
                    <td className="py-3.5 px-3 whitespace-nowrap"><LoanStatusBadge applicationStage={loan.application_stage} applicationStageLabel={loan.application_stage_label} /></td>
                    <td className="py-3.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => exportLoanPDF(loan)}
                          className="p-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 transition-colors"
                          title="Export PDF"
                        >
                          <Printer size={12} className="text-accent" />
                        </button>
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenWhatsAppId(openWhatsAppId === `d-${loan.id}` ? null : `d-${loan.id}`)}
                            className="p-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-green-500/10 transition-colors" title="Share via WhatsApp">
                            <MessageCircle size={12} className="text-green-500" />
                          </button>
                          {openWhatsAppId === `d-${loan.id}` && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-20">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenWhatsAppId(null);
                                  try {
                                    const docsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loan.id}/documents`, {
                                      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                                    });
                                    const documents = docsResponse.ok ? await docsResponse.json() : [];
                                    const docFiles = await fetchDocumentFiles(documents);
                                    await shareToCustomer(loan, docFiles.map(d => d.file));
                                  } catch (error) {
                                    toast.error('Failed to share to customer');
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors border-b border-border"
                              >
                                📱 To Customer
                                <div className="text-muted-foreground text-[10px] mt-0.5">{loan.mobile || 'No phone'}</div>
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenWhatsAppId(null);
                                  try {
                                    const docsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loan.id}/documents`, {
                                      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                                    });
                                    const documents = docsResponse.ok ? await docsResponse.json() : [];
                                    const docFiles = await fetchDocumentFiles(documents);
                                    await shareToWhatsAppWithPhone(loan, docFiles.map(d => d.file));
                                  } catch (error) {
                                    toast.error('Failed to share via WhatsApp');
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors"
                              >
                                📞 Other Number
                                <div className="text-muted-foreground text-[10px] mt-0.5">Enter phone</div>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {showUpdateColumn && (
                      <td className="py-3.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStageUpdate(loan)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 transition-colors"
                        >
                          <Settings size={14} /> Update
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
