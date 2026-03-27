import React, { useState } from 'react';
import { CreditCard, RefreshCw, ChevronDown, ChevronUp, Loader2, AlertTriangle, CheckCircle, User, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

function fmt(v: any) { return v || '—'; }
function fmtCur(v: any) {
  const n = Number(v);
  return isNaN(n) || n === 0 ? '—' : `₹${n.toLocaleString('en-IN')}`;
}
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  '10': 'Auto Loan', '00': 'Other', '01': 'Personal Loan', '02': 'Home Loan',
  '03': 'Credit Card', '04': 'Two Wheeler', '05': 'Consumer Loan',
  '06': 'Gold Loan', '07': 'Education Loan', '08': 'Business Loan',
  '09': 'Overdraft', '11': 'Commercial Vehicle', '12': 'Tractor Loan',
};
function fmtAccType(v: any) {
  if (!v) return '—';
  return ACCOUNT_TYPE_MAP[String(v)] || String(v);
}

// ── Score Gauge (half-circle, 300–900) ──────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(Math.max((score - 300) / 600, 0), 1);
  const color = score >= 750 ? '#16a34a' : score >= 700 ? '#22c55e' : score >= 650 ? '#f59e0b' : score >= 600 ? '#f97316' : '#ef4444';
  const label = score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Fair' : score >= 600 ? 'Average' : 'Poor';

  // Half-circle: left=180°, right=0°, drawn left→right
  const R = 64, cx = 90, cy = 82;
  const totalArc = Math.PI * R;
  const fillArc = pct * totalArc;
  // Arc path: start at left end, sweep to right end
  const sx = cx - R, sy = cy;
  const ex = cx + R, ey = cy;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <svg width="180" height="96" viewBox="0 0 180 96">
          {/* Track */}
          <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`}
            fill="none" stroke="#e5e7eb" strokeWidth="13" strokeLinecap="round" />
          {/* Colored fill */}
          <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`}
            fill="none" stroke={color} strokeWidth="13" strokeLinecap="round"
            strokeDasharray={`${fillArc} ${totalArc}`} />
          {/* 300 label */}
          <text x={sx - 2} y={sy + 14} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="500">300</text>
          {/* 900 label */}
          <text x={ex + 2} y={ey + 14} textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="500">900</text>
        </svg>
        {/* Score + label centered inside arc */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 pointer-events-none">
          <span className="text-3xl font-extrabold leading-none" style={{ color }}>{score}</span>
          <span className="text-xs font-bold mt-0.5" style={{ color }}>{label}</span>
        </div>
      </div>

      {/* Legend bar */}
      <div className="flex w-full mt-2 rounded-full overflow-hidden h-2">
        {[['#ef4444',20],['#f97316',17],['#f59e0b',16],['#22c55e',17],['#16a34a',30]].map(([c,w],i)=>(
          <div key={i} style={{ background: c as string, width: `${w}%` }} />
        ))}
      </div>
      <div className="flex justify-between w-full mt-1 px-0.5">
        {['Poor','Average','Fair','Good','Excellent'].map(l => (
          <span key={l} className={`text-[9px] font-semibold ${
            l === label ? 'text-foreground' : 'text-muted-foreground'
          }`}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ── Small label+value cell ───────────────────────────────────────────────────
function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg px-2.5 py-1.5 min-w-0">
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xs font-semibold truncate ${highlight ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

// ── DPD color helper ─────────────────────────────────────────────────────────
function dpdColor(dpd: number) {
  if (dpd === 0) return { bg: 'bg-green-500', text: '✓' };
  if (dpd <= 30) return { bg: 'bg-yellow-400', text: String(dpd) };
  if (dpd <= 60) return { bg: 'bg-orange-500', text: String(dpd) };
  return { bg: 'bg-red-600', text: String(dpd) };
}

// ── Collapsible section wrapper ─────────────────────────────────────────────
function CollapsibleSection({ label, dot, defaultOpen = false, children }: {
  label: string; dot: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot} inline-block`} />
          {label}
        </p>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </div>
      {open && <div className="px-4 pb-4 pt-3 border-t border-border">{children}</div>}
    </div>
  );
}

// ── Account card with full payment history ───────────────────────────────────
function AccountCard({ acc, defaultOpen }: { acc: any; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const isActive = acc.account_status === 'Active';
  const overdue = Number(acc.amount_overdue || 0);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={14} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{fmt(acc.subscriber_name)}</p>
            <p className="text-[10px] text-muted-foreground">{fmtAccType(acc.account_type)} · {fmtCur(acc.sanctioned_amount)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {overdue > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
              DPD
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}>
            {isActive ? 'Active' : 'Closed'}
          </span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="px-3 pb-4 border-t border-border bg-muted/5 space-y-3">
          {/* Account details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-3">
            <Cell label="Account No." value={fmt(acc.account_number)} />
            <Cell label="Lender" value={fmt(acc.subscriber_name)} />
            <Cell label="Account Type" value={fmtAccType(acc.account_type)} />
            <Cell label="Sanctioned Amt" value={fmtCur(acc.sanctioned_amount)} />
            <Cell label="Current Balance" value={fmtCur(acc.current_balance)} />
            <Cell label="Amount Overdue" value={overdue > 0 ? fmtCur(overdue) : '₹0'} highlight={overdue > 0} />
            <Cell label="EMI Amount" value={fmtCur(acc.emi_amount)} />
            <Cell label="Open Date" value={fmt(acc.open_date)} />
            <Cell label="Close Date" value={fmt(acc.close_date)} />
            <Cell label="Last Payment" value={fmt(acc.date_of_last_payment)} />
            <Cell label="Date Reported" value={fmt(acc.date_reported)} />
            <Cell label="Holder Type" value={fmt(acc.account_holder_type)} />
          </div>

          {/* Payment History */}
          {acc.payment_history && acc.payment_history.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', color: '#6b7280' }}>
                Payment History ({acc.payment_history.length} months)
              </p>
              {(() => {
                const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const byYear: Record<string, { mon: string; bg: string; dpd: number }[]> = {};
                acc.payment_history.forEach((ph: any) => {
                  const raw = String(ph.month || '');
                  let mm = '', yyyy = '';
                  if (raw.includes('/')) { [mm, yyyy] = raw.split('/'); }
                  else if (raw.length === 6) { yyyy = raw.slice(0, 4); mm = raw.slice(4, 6); }
                  else if (raw.length === 7 && raw.includes('-')) { [mm, yyyy] = raw.split('-'); }
                  const monLabel = MONTHS[Number(mm) - 1] || mm || raw;
                  const yr = yyyy || raw;
                  const dpd = Number(ph.days_past_due || 0);
                  const bg = dpd === 0 ? '#16a34a' : dpd <= 30 ? '#ca8a04' : dpd <= 60 ? '#ea580c' : '#dc2626';
                  if (!byYear[yr]) byYear[yr] = [];
                  byYear[yr].push({ mon: monLabel, bg, dpd });
                });
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.entries(byYear).sort(([a],[b]) => Number(b) - Number(a)).map(([yr, items]) => (
                      <div key={yr} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '44px', paddingTop: '4px', color: 'inherit' }}>{yr}</span>
                        <div style={{ overflowX: 'auto', flex: 1 }}>
                          <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
                            {items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '38px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{item.dpd === 0 ? '✓' : item.dpd}</span>
                                </div>
                                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textAlign: 'center', display: 'block' }}>{item.mon}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                {[['#16a34a','On Time'],['#ca8a04','1–30 DPD'],['#ea580c','31–60 DPD'],['#dc2626','60+ DPD']].map(([c,l])=>(
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c as string }} />
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
interface Props { loan: any; }

export default function CibilCreditReport({ loan }: Props) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<string | null>(null);


  const fetchReport = async (forceRefresh = false) => {
    const parts = (loan.applicant_name || '').trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    if (!firstName) { toast.error('Applicant name required'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/link-loan/credit-report`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          mobile: loan.mobile || '',
          rc_number: loan.vehicle_number || '',
          force_refresh: forceRefresh,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch credit report');
      setReport(data);
      setFromCache(data.from_cache || false);
      setCacheAge(data.cache_age || null);

    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const score: number = report?.credit_score || 0;
  const full = report?.full_report || {};
  const personal = full.personal || {};
  const accounts: any[] = full.accounts || [];
  const enquiries: any[] = full.enquiries || [];
  const autoLoans: any[] = report?.auto_loans || [];

  const activeCount = accounts.filter(a => a.account_status === 'Active').length;
  const closedCount = accounts.filter(a => a.account_status !== 'Active').length;
  const totalBalance = accounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);
  const totalOverdue = accounts.reduce((s, a) => s + (Number(a.amount_overdue) || 0), 0);

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-primary" />
          <span className="text-sm font-bold text-foreground">CIBIL / Experian Credit Report</span>
          {fromCache && cacheAge && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Cached · {cacheAge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={() => fetchReport(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          )}
          <button
            onClick={() => fetchReport(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-secondary font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? 'Fetching…' : report ? 'Re-fetch' : 'Fetch Credit Report'}
          </button>
        </div>
      </div>

      {/* ── Pre-fetch placeholder ── */}
      {!report && !loading && (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center space-y-1">
          <CreditCard size={28} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Fetch the Experian credit report for</p>
          <p className="text-sm font-semibold text-foreground">{loan.applicant_name} · {loan.mobile}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Fetching credit report from bureau…</span>
        </div>
      )}

      {report && !loading && (
        <>
          {/* ── Score + Summary ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Score gauge */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Credit Score</p>
              {score > 0 ? (
                <ScoreGauge score={score} />
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground py-6">
                  <AlertTriangle size={16} />
                  <span className="text-sm">Score not available</span>
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Account Summary</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Cell label="Total Accounts" value={String(accounts.length)} />
                <Cell label="Active Accounts" value={String(activeCount)} />
                <Cell label="Closed Accounts" value={String(closedCount)} />
                <Cell label="Auto Loans" value={String(autoLoans.length)} />
                <Cell label="Total Balance" value={fmtCur(totalBalance)} />
                <Cell label="Total Overdue" value={totalOverdue > 0 ? fmtCur(totalOverdue) : '₹0'} highlight={totalOverdue > 0} />
                <Cell label="Enquiries" value={String(enquiries.length)} />
              </div>
              <div className="mt-3">
                {totalOverdue > 0 ? (
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold">
                    <AlertTriangle size={12} /> Overdue amount detected — review required
                  </div>
                ) : accounts.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-semibold">
                    <CheckCircle size={12} /> No overdue amount
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Personal Information ── */}
          {(personal.name || personal.pan || personal.mobile) && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={14} className="text-primary" />
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Personal Information</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {personal.name    && <Cell label="Full Name"     value={personal.name} />}
                {personal.dob     && <Cell label="Date of Birth" value={personal.dob} />}
                {personal.gender  && <Cell label="Gender"        value={personal.gender} />}
                {personal.pan     && <Cell label="PAN"           value={personal.pan} />}
                {personal.mobile  && <Cell label="Mobile"        value={personal.mobile} />}
                {personal.email   && <Cell label="Email"         value={personal.email} />}
                {personal.address && (
                  <div className="col-span-2 sm:col-span-3 bg-muted/30 rounded-lg px-2.5 py-1.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Address</p>
                    <p className="text-xs font-semibold text-foreground">{personal.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Active Accounts ── */}
          <CollapsibleSection
            label={`Active Accounts (${activeCount})`}
            dot="bg-green-500"
            defaultOpen
          >
            {activeCount > 0 ? (
              <div className="space-y-2">
                {accounts.filter(a => a.account_status === 'Active').map((acc, i) => (
                  <AccountCard key={i} acc={acc} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No active accounts found.</p>
            )}
          </CollapsibleSection>

          {/* ── Closed Accounts ── */}
          <CollapsibleSection
            label={`Closed Accounts (${closedCount})`}
            dot="bg-muted-foreground"
          >
            {closedCount > 0 ? (
              <div className="space-y-2">
                {accounts.filter(a => a.account_status !== 'Active').map((acc, i) => (
                  <AccountCard key={i} acc={acc} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No closed accounts found.</p>
            )}
          </CollapsibleSection>

          {/* ── Enquiries ── */}
          {enquiries.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Search size={13} className="text-primary" />
                Credit Enquiries ({enquiries.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Institution</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Purpose</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((e: any, i: number) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-semibold text-foreground">{fmt(e.institution_name)}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{fmt(e.enquiry_purpose)}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{fmt(e.enquiry_date)}</td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">{e.amount > 0 ? fmtCur(e.amount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


        </>
      )}
    </div>
  );
}
