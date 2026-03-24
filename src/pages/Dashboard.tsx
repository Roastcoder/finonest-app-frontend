import { useState } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, CheckCircle2, IndianRupee, PieChart as PieChartIcon, Building2, TrendingUp, Calendar, ArrowUpRight, BarChart3, Target } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '@/lib/auth';

const STATUS_CHART_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState('this_month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.branch_id, timeline, dateRange],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ timeline });
        if (timeline === 'custom' && dateRange.start && dateRange.end) {
          params.append('startDate', dateRange.start);
          params.append('endDate', dateRange.end);
        }
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/dashboard/stats?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  if (!user) return null;

  const stats = dashboardData || {
    loginBankWise: [],
    disbursementBankWise: [],
    pddTracker: {},
    stageBreakdown: [],
    monthlyTracker: { login: 0, inProcess: 0, approved: { units: 0, amount: 0 }, disbursed: { units: 0, amount: 0 } },
    inProcessTags: []
  };

  const mockAreaData = [
    { name: 'Mon', logins: 4, approved: 2 },
    { name: 'Tue', logins: 7, approved: 4 },
    { name: 'Wed', logins: 12, approved: 6 },
    { name: 'Thu', logins: 15, approved: 8 },
    { name: 'Fri', logins: 22, approved: 12 },
    { name: 'Sat', logins: 14, approved: 7 },
    { name: 'Sun', logins: 8, approved: 4 },
  ];

  const chartCardClass = "bg-white dark:bg-gray-900/40 rounded-3xl border border-border/50 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300";
  const headerClass = "px-6 py-4 border-b border-border/50 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20";
  const labelClass = "text-xs font-bold text-muted-foreground uppercase tracking-widest";

  return (
    <div className="flex flex-col gap-6 lg:gap-8 w-full pb-10">
      {/* Filters Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">Executive Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time performance analytics and loan tracking</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-border/50 p-2 ml-auto sm:ml-0">
          <Calendar size={16} className="text-primary ml-2" />
          <select
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            className="px-3 py-1.5 rounded-xl border-0 bg-transparent text-sm font-bold text-foreground focus:outline-none focus:ring-0 cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {timeline === 'custom' && (
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border/50">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-2 py-1.5 rounded-lg border border-border/50 bg-background text-[10px] font-bold focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] font-black text-muted-foreground">TO</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-2 py-1.5 rounded-lg border border-border/50 bg-background text-[10px] font-bold focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 w-full">
        {/* Total Logins */}
        <div className="bg-white dark:bg-gray-900/40 rounded-3xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-primary group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <ArrowUpRight size={16} className="text-emerald-500 opacity-50" />
          </div>
          <div>
            <p className={labelClass}>Total Logins</p>
            <h4 className="text-3xl font-black text-foreground mt-1">{stats.monthlyTracker?.login || 0}</h4>
            <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <TrendingUp size={10} /> +12% vs last period
            </p>
          </div>
        </div>

        {/* In Process */}
        <div className="bg-white dark:bg-gray-900/40 rounded-3xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <p className={labelClass}>In Process</p>
            <h4 className="text-3xl font-black text-foreground mt-1">{stats.monthlyTracker?.inProcess || 0}</h4>
            <p className="text-[10px] text-amber-600 font-bold mt-2">Active applications</p>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white dark:bg-gray-900/40 rounded-3xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div>
            <p className={labelClass}>Approved</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="text-3xl font-black text-foreground">{stats.monthlyTracker?.approved?.units || 0}</h4>
              <span className="text-sm font-bold text-muted-foreground">₹{((stats.monthlyTracker?.approved?.amount || 0) / 100000).toFixed(1)}L</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-bold mt-2">Ready for disbursement</p>
          </div>
        </div>

        {/* Disbursed */}
        <div className="bg-white dark:bg-gray-900/40 rounded-3xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform">
              <IndianRupee size={20} />
            </div>
          </div>
          <div>
            <p className={labelClass}>Disbursed</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="text-3xl font-black text-foreground">{stats.monthlyTracker?.disbursed?.units || 0}</h4>
              <span className="text-sm font-bold text-muted-foreground">₹{((stats.monthlyTracker?.disbursed?.amount || 0) / 100000).toFixed(1)}L</span>
            </div>
            <p className="text-[10px] text-purple-600 font-bold mt-2">Successful completions</p>
          </div>
        </div>
      </div>

      {/* Primary Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Performance Overview (Area Chart) */}
        <div className={`${chartCardClass} lg:col-span-2`}>
          <div className={headerClass}>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="font-bold text-foreground">Performance Over Time</h3>
            </div>
          </div>
          <div className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockAreaData}>
                <defs>
                  <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="logins" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLogins)" />
                <Area type="monotone" dataKey="approved" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Funnel (New Chart) */}
        <div className={chartCardClass}>
          <div className={headerClass}>
            <div className="flex items-center gap-2">
              <Target size={18} className="text-primary" />
              <h3 className="font-bold text-foreground">Lead Conversion Funnel</h3>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {stats.stageBreakdown && stats.stageBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.stageBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} width={80} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {stats.stageBreakdown.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 opacity-30">
                <BarChart3 size={48} className="mx-auto mb-2" />
                <p className="text-xs font-bold">No data available for current period</p>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {stats.stageBreakdown?.slice(0, 4).map((s: any, i: number) => (
                <div key={s.stage} className="flex flex-col p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-border/50">
                  <span className="text-[10px] text-muted-foreground capitalize">{s.stage}</span>
                  <span className="text-sm font-black text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts: Bank Wise Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        
        {/* Bank-wise Login Volume */}
        <div className={chartCardClass}>
          <div className={headerClass}>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              <h3 className="font-bold text-foreground">Login Volume by Bank</h3>
            </div>
          </div>
          <div className="p-6 h-[250px]">
            {stats.loginBankWise && stats.loginBankWise.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.loginBankWise}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="bankName" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center opacity-20">No data</div>}
          </div>
        </div>

        {/* Bank-wise Disbursement Amount */}
        <div className={chartCardClass}>
          <div className={headerClass}>
            <div className="flex items-center gap-2">
              <IndianRupee size={18} className="text-primary" />
              <h3 className="font-bold text-foreground">Disbursement Value (INR)</h3>
            </div>
          </div>
          <div className="p-6 h-[250px]">
            {stats.disbursementBankWise && stats.disbursementBankWise.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.disbursementBankWise}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="bankName" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip 
                    formatter={(value: number) => `₹${(value/100000).toFixed(2)}L`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center opacity-20">No data</div>}
          </div>
        </div>
      </div>

      {/* Detailed Data Tables (Mobile Scrollers) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Table 1 */}
        <div className={chartCardClass}>
          <div className={headerClass}><h3 className="font-bold text-foreground text-sm">Financier Performance Matrix</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Financier</th>
                  <th className="px-6 py-4 text-center">Logins</th>
                  <th className="px-6 py-4 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {stats.disbursementBankWise?.map((bank: any, i: number) => (
                  <tr key={i} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-border/50 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                        <Building2 size={14} />
                      </div>
                      <span className="font-bold text-sm text-foreground">{bank.bankName}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-sm text-muted-foreground">{bank.units || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-sm text-primary">₹{(bank.amount / 100000).toFixed(2)}L</span>
                    </td>
                  </tr>
                ))}
                {(!stats.disbursementBankWise || stats.disbursementBankWise.length === 0) && (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-xs opacity-50">No financier data listed for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* List: Recent Status Summary */}
        <div className={chartCardClass}>
          <div className={headerClass}><h3 className="font-bold text-foreground text-sm">Application Breakdown</h3></div>
          <div className="p-6 space-y-4">
            {stats.inProcessTags?.length > 0 ? (
              stats.inProcessTags.map((tag: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-border/50 hover:border-primary/30 transition-all cursor-default">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-10 rounded-full bg-primary/20">
                      <div className="w-full h-1/2 bg-primary rounded-full"></div>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-foreground">{tag.tag}</h5>
                      <span className="text-[10px] text-muted-foreground font-bold">Needs Immediate Action</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-black text-primary leading-none">{tag.count}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Units</span>
                  </div>
                </div>
              ))
            ) : <p className="text-center py-10 opacity-30 text-xs font-bold">Comprehensive breakdown unavailable</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
