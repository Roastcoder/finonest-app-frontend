import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/mock-data';
import { exportToCSV } from '@/lib/export-utils';
import { BarChart3, Download, FileText, IndianRupee, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { toast } from 'sonner';
import MobileStatCarousel from '@/components/MobileStatCarousel';

const CHART_COLORS = ['#2dd4bf', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6b7280', '#ec4899'];
const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted', under_review: 'Under Review',
  approved: 'Approved', rejected: 'Rejected', disbursed: 'Disbursed', cancelled: 'Cancelled'
};

export default function Reports() {
  const [reportType, setReportType] = useState<'overview' | 'bank' | 'status' | 'disbursal'>('overview');

  const { data: loans = [] } = useQuery({
    queryKey: ['loans-reports'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch loans');
      return res.json();
    },
  });

  const statusData = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: (loans as any[]).filter(l => l.status === key).length,
  })).filter(d => d.value > 0);

  const bankData = [...new Set((loans as any[]).map(l => l.banks?.name).filter(Boolean))].map(bank => ({
    name: bank.replace(' Bank', ''),
    cases: (loans as any[]).filter(l => l.banks?.name === bank).length,
    amount: (loans as any[]).filter(l => l.banks?.name === bank).reduce((s, l) => s + Number(l.loan_amount), 0) / 100000,
  }));

  const totalVolume = (loans as any[]).reduce((s, l) => s + Number(l.loan_amount), 0);
  const avgLoanSize = loans.length > 0 ? totalVolume / loans.length : 0;
  const conversionRate = loans.length > 0 ? Math.round(((loans as any[]).filter(l => l.status === 'disbursed').length / loans.length) * 100) : 0;

  const handleExportCSV = () => {
    if (loans.length === 0) { toast.error('No data to export'); return; }
    const rows = (loans as any[]).map(l => ({
      'Loan ID': l.id,
      'Applicant': l.applicant_name,
      'Mobile': l.mobile,
      'Vehicle': `${l.car_make || ''} ${l.car_model || ''}`.trim(),
      'Bank': l.banks?.name || '',
      'Broker': l.brokers?.name || '',
      'Loan Amount': l.loan_amount,
      'EMI': l.emi,
      'Tenure': l.tenure,
      'Interest Rate': l.interest_rate,
      'Status': STATUS_LABELS[l.status] || l.status,
      'Created': new Date(l.created_at).toLocaleDateString('en-IN'),
    }));
    exportToCSV(rows, 'loan-report');
    toast.success('Report exported as CSV!');
  };

  const statItems = [
    { icon: <FileText size={16} />, label: 'Total Applications', value: String(loans.length) },
    { icon: <IndianRupee size={16} />, label: 'Total Volume', value: formatCurrency(totalVolume) },
    { icon: <TrendingUp size={16} />, label: 'Avg. Loan Size', value: formatCurrency(avgLoanSize) },
    { icon: <BarChart3 size={16} />, label: 'Conversion Rate', value: `${conversionRate}%` },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Comprehensive business insights</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* KPIs - Mobile Carousel */}
      <div className="mb-6">
        <MobileStatCarousel items={statItems} />
      </div>

      {/* Report type tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'bank', label: 'Bank-wise' },
          { key: 'status', label: 'Status-wise' },
          { key: 'disbursal', label: 'Disbursal Trend' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setReportType(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${reportType === tab.key ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(reportType === 'overview' || reportType === 'bank') && (
          <div className="stat-card">
            <h3 className="font-semibold text-foreground mb-4">Bank-wise Distribution (₹ Lakhs)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bankData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="amount" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(reportType === 'overview' || reportType === 'status') && (
          <div className="stat-card">
            <h3 className="font-semibold text-foreground mb-4">Status Breakdown</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(reportType === 'overview' || reportType === 'disbursal') && (
          <div className="stat-card lg:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">Monthly Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bankData.length > 0 ? bankData.map(b => ({ name: b.name, cases: b.cases, amount: b.amount })) : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="cases" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} name="Cases" />
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Amount (₹L)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
