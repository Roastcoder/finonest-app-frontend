import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, AlertTriangle, CheckCircle, RefreshCw, Car, CreditCard,
  Building2, ChevronDown, ChevronUp, Loader2, ShieldAlert, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ALLOWED_ROLES = ['admin', 'sales_manager', 'branch_manager'];

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

interface AutoLoan {
  account_number?: string;
  subscriber_name?: string;
  account_type?: string;
  sanctioned_amount?: number;
  current_balance?: number;
  open_date?: string;
  account_holder_type?: string;
  ownership_indicator?: string;
  account_status?: string;
}

function InfoCell({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-semibold text-muted-foreground uppercase tracking-wide ${small ? 'text-[9px]' : 'text-[10px]'}`}>{label}</span>
      <span className={`font-bold ${small ? 'text-xs' : 'text-sm'} ${highlight ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function TagLinkLoanButton({ rc, lender, loans }: { rc: string; lender: string; loans: AutoLoan[] }) {
  const [tagging, setTagging] = useState(false);
  const [tagged, setTagged] = useState(false);

  const handleTag = async () => {
    setTagging(true);
    try {
      const res = await fetch(`${API}/link-loan/tag-lead`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rc_number: rc, lender, link_loans: loans }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to tag lead');
      setTagged(true);
      toast.success('Lead tagged as LINK LOAN EXIST');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTagging(false);
    }
  };

  if (tagged) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 text-green-700 dark:text-green-400 text-sm font-semibold">
        <CheckCircle size={16} /> Lead successfully tagged as LINK LOAN EXIST
      </div>
    );
  }

  return (
    <button
      onClick={handleTag}
      disabled={tagging}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-60 transition-all"
    >
      {tagging ? <Loader2 size={15} className="animate-spin" /> : <Tag size={15} />}
      Tag Lead as LINK LOAN EXIST
    </button>
  );
}

export default function LinkLoanFinder() {
  const { user } = useAuth();

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const [rc, setRc] = useState('');
  const [loadingRc, setLoadingRc] = useState(false);
  const [vehicle, setVehicle] = useState<any>(null);
  const [manualMobile, setManualMobile] = useState('');
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');
  const [loadingCredit, setLoadingCredit] = useState(false);
  const [autoLoans, setAutoLoans] = useState<AutoLoan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<AutoLoan | null>(null);
  const [sameLenderLoans, setSameLenderLoans] = useState<AutoLoan[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const handleRcSearch = async () => {
    if (!rc.trim()) { toast.error('Enter a vehicle RC number'); return; }
    setLoadingRc(true);
    setVehicle(null); setAutoLoans([]); setSelectedLoan(null); setSameLenderLoans([]);
    setManualMobile(''); setManualFirstName(''); setManualLastName('');
    try {
      const res = await fetch(`${API}/link-loan/rc-lookup`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rc_number: rc.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'RC lookup failed');
      setVehicle(data);
      // Pre-fill manual fields with whatever was found
      setManualMobile(data.mobile || '');
      setManualFirstName(data.first_name || '');
      setManualLastName(data.last_name || '');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingRc(false);
    }
  };

  const handleFetchCredit = async (forceRefresh = false) => {
    if (!vehicle) return;
    // Use manual inputs (which are pre-filled from RC data, or user-entered if missing)
    const firstName = manualFirstName.trim();
    const lastName = manualLastName.trim();
    const mobile = manualMobile.trim();
    if (!firstName) {
      toast.error('Customer first name is required. Please enter it above.');
      return;
    }
    setLoadingCredit(true);
    setAutoLoans([]); setSelectedLoan(null); setSameLenderLoans([]);
    try {
      const res = await fetch(`${API}/link-loan/credit-report`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          mobile,
          first_name: firstName,
          last_name: lastName,
          rc_number: rc.trim().toUpperCase(),
          force_refresh: forceRefresh,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credit report fetch failed');
      setAutoLoans(data.auto_loans || []);
      setFromCache(data.from_cache || false);
      setCacheAge(data.cache_age || null);
      if ((data.auto_loans || []).length === 0) toast.info('No active auto loans found in credit report');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingCredit(false);
    }
  };

  const handleSelectLoan = (loan: AutoLoan) => {
    setSelectedLoan(loan);
    const lender = (loan.subscriber_name || '').toLowerCase();
    const others = autoLoans.filter(l => l !== loan && (l.subscriber_name || '').toLowerCase() === lender);
    setSameLenderLoans(others);
  };

  const isFinanced = vehicle?.finance_status && !['not financed', 'noc issued', 'clear', ''].includes((vehicle.finance_status || '').toLowerCase());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldAlert size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Link Loan Finder</h1>
          <p className="text-sm text-muted-foreground">Check for linked loans via RC number and Experian credit report</p>
        </div>
      </div>

      {/* Step 1: RC Search */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Car size={16} className="text-primary" /> Step 1 — Vehicle RC Lookup
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={rc}
            onChange={e => setRc(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleRcSearch()}
            placeholder="Enter RC Number (e.g. MH12AB1234)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono uppercase"
          />
          <button
            onClick={handleRcSearch}
            disabled={loadingRc}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-secondary font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {loadingRc ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {vehicle && (
          <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCell label="Owner Name" value={`${vehicle.first_name || ''} ${vehicle.last_name || ''}`.trim() || '—'} />
              <InfoCell label="Mobile" value={fmt(vehicle.mobile)} />
              <InfoCell label="RC Number" value={fmt(vehicle.rc_number)} />
              <InfoCell label="Vehicle" value={`${fmt(vehicle.maker_name)} ${fmt(vehicle.model_name)}`.trim()} />
              <InfoCell label="Finance Status" value={fmt(vehicle.finance_status)} highlight={isFinanced} />
              <InfoCell label="Financer" value={fmt(vehicle.financer)} />
            </div>

            {!isFinanced ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
                <CheckCircle size={16} /> Vehicle is not currently financed. No link loan check required.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Manual input fields — always shown so user can correct if RC data is masked */}
                <div className="p-3 rounded-lg border border-border bg-background/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Customer Details for Credit Report
                    {(vehicle.mobile_missing || vehicle.name_missing) && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400 normal-case font-semibold">
                        ⚠ Some details missing from RC — please fill in
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                        First Name {vehicle.name_missing && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={manualFirstName}
                        onChange={e => setManualFirstName(e.target.value)}
                        placeholder="First name"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Last Name</label>
                      <input
                        type="text"
                        value={manualLastName}
                        onChange={e => setManualLastName(e.target.value)}
                        placeholder="Last name"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                        Mobile {vehicle.mobile_missing && <span className="text-amber-500">(optional)</span>}
                      </label>
                      <input
                        type="tel"
                        value={manualMobile}
                        onChange={e => setManualMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle size={16} /> Vehicle is financed — fetch credit report to check for link loans
                  </div>
                  <div className="flex items-center gap-2">
                    {fromCache && cacheAge && (
                      <span className="text-xs text-muted-foreground">Cached · {cacheAge}</span>
                    )}
                    {user.role === 'admin' && fromCache && (
                      <button
                        onClick={() => handleFetchCredit(true)}
                        disabled={loadingCredit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                      >
                        <RefreshCw size={13} className={loadingCredit ? 'animate-spin' : ''} /> Repull Fresh
                      </button>
                    )}
                    <button
                      onClick={() => handleFetchCredit(false)}
                      disabled={loadingCredit || !manualFirstName.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-secondary font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all"
                    >
                      {loadingCredit ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                      {loadingCredit ? 'Fetching…' : 'Fetch Credit Report'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Active Auto Loans */}
      {autoLoans.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
            <CreditCard size={16} className="text-primary" /> Step 2 — Active Auto Loans Found
          </h2>
          {fromCache && (
            <p className="text-xs text-muted-foreground mb-3">Data from cache · {cacheAge}</p>
          )}
          <p className="text-xs text-muted-foreground mb-4">Select the loan linked to this vehicle</p>
          <div className="space-y-2">
            {autoLoans.map((loan, i) => (
              <div
                key={i}
                onClick={() => handleSelectLoan(loan)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedLoan === loan
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedLoan === loan ? 'border-primary' : 'border-muted-foreground'}`}>
                      {selectedLoan === loan && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-semibold text-sm text-foreground">{fmt(loan.subscriber_name)}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    loan.account_status === 'Active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {fmt(loan.account_status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-6">
                  <InfoCell label="Account Type" value={fmt(loan.account_type)} small />
                  <InfoCell label="Sanctioned" value={fmtCur(loan.sanctioned_amount)} small />
                  <InfoCell label="Balance" value={fmtCur(loan.current_balance)} small />
                  <InfoCell label="Opened" value={fmt(loan.open_date)} small />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [i]: !prev[i] })); }}
                  className="ml-6 mt-2 text-xs text-primary flex items-center gap-1"
                >
                  {expanded[i] ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> More details</>}
                </button>
                {expanded[i] && (
                  <div className="ml-6 mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border">
                    <InfoCell label="Account No." value={fmt(loan.account_number)} small />
                    <InfoCell label="Holder Type" value={fmt(loan.account_holder_type || loan.ownership_indicator)} small />
                    <InfoCell label="Ownership" value={fmt(loan.ownership_indicator)} small />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Same Lender Analysis */}
      {selectedLoan && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-primary" /> Step 3 — Same Lender Analysis
          </h2>

          {sameLenderLoans.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
              <CheckCircle size={16} />
              No other active loans found from <strong className="mx-1">{selectedLoan.subscriber_name}</strong>. No link loan detected.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alert Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-700">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700 dark:text-red-400 text-sm">⚠ Multiple Loans Found from Same Lender</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {sameLenderLoans.length} additional active loan{sameLenderLoans.length > 1 ? 's' : ''} found from{' '}
                    <strong>{selectedLoan.subscriber_name}</strong>. This case should be tagged as{' '}
                    <strong>LINK LOAN EXIST</strong>.
                  </p>
                </div>
              </div>

              {/* Same Lender Loan Cards */}
              {sameLenderLoans.map((loan, i) => (
                <div key={i} className="p-4 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-foreground">{fmt(loan.subscriber_name)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-semibold">
                      LINK LOAN
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <InfoCell label="Lender Name" value={fmt(loan.subscriber_name)} />
                    <InfoCell label="Loan Account Type" value={fmt(loan.account_type)} />
                    <InfoCell label="Sanctioned Amount" value={fmtCur(loan.sanctioned_amount)} />
                    <InfoCell label="Balance Amount" value={fmtCur(loan.current_balance)} />
                    <InfoCell label="Account Opening Date" value={fmt(loan.open_date)} />
                    <InfoCell label="Account Holder Type" value={fmt(loan.account_holder_type || loan.ownership_indicator)} />
                  </div>
                </div>
              ))}

              <TagLinkLoanButton rc={rc} lender={selectedLoan.subscriber_name || ''} loans={sameLenderLoans} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
