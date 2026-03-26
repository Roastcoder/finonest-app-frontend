import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { APPLICATION_STAGES, ApplicationStage } from '@/lib/mock-data';
import { X, Save, AlertCircle, ShieldAlert, Loader2, CheckCircle, AlertTriangle, Building2, CreditCard } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
}
function fmt(v: any) { return v || '—'; }
function fmtCur(v: any) {
  const n = Number(v);
  return isNaN(n) || n === 0 ? '—' : `₹${n.toLocaleString('en-IN')}`;
}
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}

interface LoanApplicationStageManagerProps {
  loan: any;
  isOpen: boolean;
  onClose: () => void;
}

interface StageFormData {
  stage: ApplicationStage;
  appScore?: number;
  creditScore?: number;
  tags?: string[];
  remarks?: string;
  loanAmount?: number;
  roi?: number;
  tenure?: number;
  loanAccountNumber?: string;
  rcType?: 'PHYSICAL_RC' | 'DIGITAL_RC';
  collectedBy?: 'SELF' | 'RTO_AGENT' | 'BANKER';
  agentName?: string;
  agentMobile?: string;
  bankerName?: string;
  bankerMobile?: string;
  linkLoanChecked?: 'Yes' | 'No';
}

export default function LoanApplicationStageManager({ loan, isOpen, onClose }: LoanApplicationStageManagerProps) {
  const queryClient = useQueryClient();

  const STAGE_ORDER: ApplicationStage[] = ['SUBMITTED', 'LOGIN', 'IN_PROCESS', 'APPROVED', 'DISBURSED'];
  const currentStage: ApplicationStage = loan?.application_stage || 'SUBMITTED';
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const loginFilled = !!(loan?.app_score && loan?.credit_score);

  // Link Loan auto-check state (shown at LOGIN)
  const [llAutoLoans, setLlAutoLoans] = useState<any[]>([]);
  const [llLoading, setLlLoading] = useState(false);
  const [llChecked, setLlChecked] = useState(false);
  const [llAutoTagged, setLlAutoTagged] = useState(false);

  const getDefaultStage = (): ApplicationStage => {
    return currentStage;
  };

  const [formData, setFormData] = useState<StageFormData>({
    stage: getDefaultStage(),
    appScore: loan?.app_score || undefined,
    creditScore: loan?.credit_score || undefined,
    tags: loan?.tags || [],
    remarks: '',
    loanAmount: loan?.loan_amount || undefined,
    roi: loan?.roi || undefined,
    tenure: loan?.tenure || undefined,
    loanAccountNumber: loan?.loan_account_number || '',
    rcType: loan?.rc_type || 'PHYSICAL_RC',
    collectedBy: loan?.rc_collected_by || 'SELF',
    agentName: loan?.rto_agent_name_rc || '',
    agentMobile: loan?.rto_agent_mobile || '',
    bankerName: loan?.banker_name || '',
    bankerMobile: loan?.banker_mobile || '',
    linkLoanChecked: loan?.link_loan_checked || undefined,
  });

  // Reinitialize form every time modal opens with fresh loan data
  useEffect(() => {
    if (isOpen && loan) {
      const cur: ApplicationStage = loan.application_stage || 'SUBMITTED';
      setFormData({
        stage: cur,
        appScore: loan.app_score || undefined,
        creditScore: loan.credit_score || undefined,
        tags: loan.tags || [],
        remarks: '',
        loanAmount: loan.loan_amount || undefined,
        roi: loan.roi || undefined,
        tenure: loan.tenure || undefined,
        loanAccountNumber: loan.loan_account_number || '',
        rcType: loan.rc_type || 'PHYSICAL_RC',
        collectedBy: loan.rc_collected_by || 'SELF',
        agentName: loan.rto_agent_name_rc || '',
        agentMobile: loan.rto_agent_mobile || '',
        bankerName: loan.banker_name || '',
        bankerMobile: loan.banker_mobile || '',
        linkLoanChecked: loan.link_loan_checked || undefined,
      });
      setLlAutoLoans([]);
      setLlChecked(false);
    }
  }, [isOpen, loan?.id]);

  // Auto-trigger link loan check when stage switches to LOGIN
  useEffect(() => {
    if (formData.stage === 'LOGIN' && loan?.id && !llChecked) {
      setLlLoading(true);
      fetch(`${API}/link-loan/auto-check/${loan.id}`, { headers: authHeaders() })
        .then(r => r.json())
        .then(async data => {
          // Filter only ACTIVE loans (account_status === '11' or 'ACTIVE')
          const activeLoans = (data.auto_loans || []).filter((l: any) => {
            const status = String(l.account_status || '').toUpperCase();
            return status === 'ACTIVE' || status === '11';
          });
          setLlAutoLoans(activeLoans);
          // Auto-fill credit score from bureau
          if (data.credit_score) {
            setFormData(prev => ({ ...prev, creditScore: data.credit_score }));
          }
          setLlChecked(true);

          // Auto-tag link loans if multiple loans from same lender
          if (activeLoans.length > 0) {
            const lenderMap: Record<string, any[]> = {};
            activeLoans.forEach((l: any) => {
              const k = (l.subscriber_name || '').toLowerCase();
              if (!lenderMap[k]) lenderMap[k] = [];
              lenderMap[k].push(l);
            });
            const hasMultiple = Object.values(lenderMap).some(arr => arr.length > 1);
            if (hasMultiple) {
              try {
                await fetch(`${API}/link-loan/tag-lead`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ loan_id: loan.id, link_loans: activeLoans, auto_tagged: true }),
                });
                setLlAutoTagged(true);
              } catch { /* silent */ }
            }
          }
        })
        .catch(() => setLlChecked(true))
        .finally(() => setLlLoading(false));
    }
  }, [formData.stage]);

  const updateStage = useMutation({
    mutationFn: async (data: StageFormData) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loan.id}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update stage');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Application stage updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update application stage');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.stage === 'LOGIN' && !formData.appScore) {
      toast.error('App Score is required for Login stage');
      return;
    }
    updateStage.mutate(formData);
  };

  const renderStageFields = () => {
    switch (formData.stage) {
      case 'SUBMITTED':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Application has been submitted and is awaiting review.</p>
          </div>
        );

      case 'LOGIN':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">App Score (0-1000) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="1000"
                  value={formData.appScore || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (e.target.value === '' || (val >= 0 && val <= 1000))
                      setFormData(prev => ({ ...prev, appScore: e.target.value ? val : undefined }));
                  }}
                  onInput={e => { const t = e.target as HTMLInputElement; if(Number(t.value) > 1000) t.value = '1000'; }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-background text-foreground"
                  placeholder="Enter app score (0-1000)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Credit Score (Bureau)</label>
                <input
                  type="number"
                  readOnly
                  value={formData.creditScore || ''}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground cursor-not-allowed"
                  placeholder={llLoading ? 'Fetching from bureau...' : 'Auto-filled from bureau'}
                />
                {!llLoading && !formData.creditScore && llChecked && (
                  <p className="text-xs text-amber-500 mt-1">⚠ Bureau score not available</p>
                )}
              </div>
            </div>

            {/* Link Loan Auto-Check at Login */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={15} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Link Loan Check (Auto)</span>
                {llLoading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
              </div>
              {llLoading && <p className="text-xs text-muted-foreground">Checking active loans from credit report…</p>}
              {!llLoading && llChecked && llAutoLoans.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-400 text-xs font-medium">
                  <CheckCircle size={14} /> No active auto loans found. No link loan risk.
                </div>
              )}
              {!llLoading && llAutoLoans.length > 0 && (() => {
                const lenderMap: Record<string, any[]> = {};
                llAutoLoans.forEach(l => {
                  const k = (l.subscriber_name || '').toLowerCase();
                  if (!lenderMap[k]) lenderMap[k] = [];
                  lenderMap[k].push(l);
                });
                const multiLenders = Object.entries(lenderMap).filter(([, arr]) => arr.length > 1);
                return (
                  <div className="space-y-3">
                    {multiLenders.length > 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-700">
                        <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-red-700 dark:text-red-400 text-xs">⚠ Multiple Active Loans from Same Lender</p>
                          {llAutoTagged && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">✓ Auto-tagged as LINK LOAN EXIST</p>
                          )}
                          {multiLenders.map(([lender, loans]) => (
                            <div key={lender} className="mt-2">
                              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">{loans[0].subscriber_name}</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {loans.map((l, i) => (
                                  <div key={i} className="p-2 rounded bg-red-100/60 dark:bg-red-900/30 grid grid-cols-2 gap-1">
                                    <InfoCell label="Type" value={l.account_type || '—'} />
                                    <InfoCell label="Sanctioned" value={`₹${Number(l.sanctioned_amount || 0).toLocaleString('en-IN')}`} />
                                    <InfoCell label="Balance" value={`₹${Number(l.current_balance || 0).toLocaleString('en-IN')}`} />
                                    <InfoCell label="Opened" value={l.open_date || '—'} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {multiLenders.length === 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-400 text-xs font-medium">
                        <CheckCircle size={14} /> {llAutoLoans.length} active loan(s) found — no duplicate lender.
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><CreditCard size={12} /> Active Auto Loans (Status: ACTIVE)</p>
                      <div className="space-y-1.5">
                        {llAutoLoans.map((l, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{l.subscriber_name || '—'}</span>
                            <span className="text-muted-foreground">{l.account_type} · ₹{Number(l.current_balance || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      case 'IN_PROCESS': {
        const PENDENCY_TAGS = [
          'Bank Statement', 'Alternate Bank Statement', 'LOAN SOA',
          'LOAN FORECLOSURE LETTER', 'NOC', 'CO-APP KYC',
          'CO-APP BANK STATEMENT', 'VEHICLE RC', 'VEHICLE VALUATION', 'FIELD INSPECTION'
        ];
        const selectedTags: string[] = formData.tags || [];
        const toggleTag = (tag: string) => {
          const updated = selectedTags.includes(tag)
            ? selectedTags.filter((t: string) => t !== tag)
            : [...selectedTags, tag];
          setFormData((prev: any) => ({ ...prev, tags: updated }));
        };
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium">Pendency Tags</label>
            <div className="grid grid-cols-2 gap-2">
              {PENDENCY_TAGS.map(tag => (
                <label key={tag} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedTags.includes(tag)
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border hover:bg-muted'
                }`}>
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  <span className="text-xs">{tag}</span>
                </label>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-xs text-muted-foreground">Selected: {selectedTags.join(', ')}</p>
            )}
          </div>
        );
      }

      case 'REJECTED':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rejection Remarks *</label>
              <textarea
                required
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                rows={3}
                placeholder="Enter reason for rejection"
              />
            </div>
          </div>
        );

      case 'APPROVED':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Loan Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.loanAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="Enter loan amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ROI (%) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.roi || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roi: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="Enter ROI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tenure (months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.tenure || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenure: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="Enter tenure"
                />
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Auto-cancellation Notice</p>
                  <p>If not disbursed within 30 days, this application will automatically move to CANCELLED stage.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'DISBURSED':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Loan Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.loanAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ROI (%) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.roi || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roi: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tenure (months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.tenure || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenure: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Loan Account Number *</label>
              <input
                type="text"
                required
                value={formData.loanAccountNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, loanAccountNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                placeholder="Enter loan account number"
              />
            </div>

            <div className="border border-border rounded-lg p-4">
              <h4 className="font-medium mb-3">Vehicle RC Status</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">RC Type *</label>
                  <select
                    required
                    value={formData.rcType}
                    onChange={(e) => setFormData(prev => ({ ...prev, rcType: e.target.value as 'PHYSICAL_RC' | 'DIGITAL_RC' }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  >
                    <option value="PHYSICAL_RC">Physical RC</option>
                    <option value="DIGITAL_RC">Digital RC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Collected By *</label>
                  <select
                    required
                    value={formData.collectedBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, collectedBy: e.target.value as 'SELF' | 'RTO_AGENT' | 'BANKER' }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  >
                    <option value="SELF">Self</option>
                    <option value="RTO_AGENT">RTO Agent</option>
                    <option value="BANKER">Banker</option>
                  </select>
                </div>
              </div>

              {formData.collectedBy === 'RTO_AGENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Agent Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.agentName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                      placeholder="Enter agent name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Agent Mobile *</label>
                    <input
                      type="tel"
                      required
                      pattern="{10}"
                      value={formData.agentMobile || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                        if (value.length <= 10) {
                          setFormData(prev => ({ ...prev, agentMobile: value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>
              )}

              {formData.collectedBy === 'BANKER' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Banker Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.bankerName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                      placeholder="Enter banker name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Banker Mobile *</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={formData.bankerMobile || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                        if (value.length <= 10) {
                          setFormData(prev => ({ ...prev, bankerMobile: value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>
              )}
            </div>


          </div>
        );

      case 'CANCELLED':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cancellation Remarks *</label>
              <textarea
                required
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                rows={3}
                placeholder="Enter reason for cancellation"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStageAllowed = (stageValue: ApplicationStage) => {
    // REJECTED and CANCELLED always allowed
    if (stageValue === 'REJECTED' || stageValue === 'CANCELLED') return true;
    const stageIndex = STAGE_ORDER.indexOf(stageValue);
    // Must go through LOGIN first before any stage beyond it
    if (stageIndex > STAGE_ORDER.indexOf('LOGIN') && !loginFilled) return false;
    // Can only move forward (or stay at current)
    return stageIndex >= currentIndex;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Update Application Stage</h2>
            <p className="text-sm text-muted-foreground">Loan: {loan?.loan_number || loan?.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Application Stage</label>
            <select
              value={formData.stage}
              onChange={(e) => {
                const newStage = e.target.value as ApplicationStage;
                setFormData(prev => ({
                  ...prev,
                  stage: newStage,
                  // Autofill login scores when switching to LOGIN
                  ...(newStage === 'LOGIN' && loginFilled ? {
                    appScore: loan?.app_score,
                    creditScore: loan?.credit_score
                  } : {})
                }));
              }}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
            >
              {APPLICATION_STAGES.map(stage => {
                const allowed = isStageAllowed(stage.value);
                return (
                  <option key={stage.value} value={stage.value} disabled={!allowed}>
                    {stage.label}{!allowed ? (stage.value !== 'REJECTED' && stage.value !== 'CANCELLED' && !loginFilled && STAGE_ORDER.indexOf(stage.value) > STAGE_ORDER.indexOf('LOGIN') ? ' (Complete Login first)' : ' (Not available)') : ''}
                  </option>
                );
              })}
            </select>
            {!loginFilled && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Complete Login stage (App Score & Credit Score) to unlock further stages</p>
            )}
          </div>

          {renderStageFields()}

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateStage.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save size={16} />
              {updateStage.isPending ? 'Updating...' : 'Update Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}