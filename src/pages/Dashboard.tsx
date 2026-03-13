import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, CheckCircle2, IndianRupee, PieChart as PieChartIcon, Building2, TrendingUp, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const STATUS_CHART_COLORS = ['#2872A1', '#5C7F94', '#CBDDE9', '#1E5A82', '#EDF4F8', '#14b8a6', '#6b7280'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState('today');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: dashboardData } = useQuery({
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
    abndBankWise: [],
    disbursementBankWise: [],
    pddTracker: {},
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

  return (
    <div className="flex flex-col gap-6 lg:gap-8 w-full max-w-full">
      {/* Filters Area */}
      <div className="flex justify-between items-center w-full">
        <h2 className="hidden lg:block text-2xl font-heading font-bold text-foreground">Overview</h2>
        
        {/* Timeline Filter */}
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-border p-1.5 ml-auto">
          <Calendar size={16} className="text-muted-foreground ml-2" />
          <select
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            className="px-2 py-1 rounded-lg border-0 bg-transparent text-sm font-semibold text-foreground focus:outline-none focus:ring-0 cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_month">This Month</option>
            <option value="custom">Date Range</option>
          </select>

          {timeline === 'custom' && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-2 py-1 rounded-md border border-border bg-background text-xs font-medium focus:outline-none focus:border-primary text-foreground"
              />
              <span className="text-[10px] font-bold text-muted-foreground">TO</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-2 py-1 rounded-md border border-border bg-background text-xs font-medium focus:outline-none focus:border-primary text-foreground"
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 1: 4-up KPI stat cards (Desktop) / 2x2 grid (Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white rounded-2xl lg:rounded-xl shadow-sm border border-border lg:border-l-[3px] lg:border-l-primary p-4 lg:p-5 card-hover flex flex-col justify-between min-h-[100px] lg:min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Users size={18} /></div>
            <div className="flex items-center gap-1 text-[10px] lg:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><TrendingUp size={12} /><span>12%</span></div>
          </div>
          <div className="mt-4">
            <p className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Logins</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-foreground">{stats.monthlyTracker?.login || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-xl shadow-sm border border-border lg:border-l-[3px] lg:border-l-primary p-4 lg:p-5 card-hover flex flex-col justify-between min-h-[100px] lg:min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Clock size={18} /></div>
            <div className="flex items-center gap-1 text-[10px] lg:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><TrendingUp size={12} /><span>4%</span></div>
          </div>
          <div className="mt-4">
            <p className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">In Process</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-foreground">{stats.monthlyTracker?.inProcess || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-xl shadow-sm border border-border lg:border-l-[3px] lg:border-l-primary p-4 lg:p-5 card-hover flex flex-col justify-between min-h-[100px] lg:min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 size={18} /></div>
          </div>
          <div className="mt-4 break-words">
            <p className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Approved</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl lg:text-3xl font-mono font-bold text-foreground leading-none">{stats.monthlyTracker?.approved?.units || 0}</p>
              <p className="text-xs lg:text-sm font-semibold text-muted-foreground">₹{((stats.monthlyTracker?.approved?.amount || 0) / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-xl shadow-sm border border-border lg:border-l-[3px] lg:border-l-primary p-4 lg:p-5 card-hover flex flex-col justify-between min-h-[100px] lg:min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><IndianRupee size={18} /></div>
          </div>
          <div className="mt-4 break-words">
            <p className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Disbursed</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl lg:text-3xl font-mono font-bold text-foreground leading-none">{stats.monthlyTracker?.disbursed?.units || 0}</p>
              <p className="text-xs lg:text-sm font-semibold text-muted-foreground">₹{((stats.monthlyTracker?.disbursed?.amount || 0) / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section: Area Chart + Donut Grid */}
      <div className="flex lg:grid overflow-x-auto snap-x lg:grid-cols-3 gap-4 lg:gap-6 pb-4 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 scroll-smooth">
        
        {/* Area Chart Card */}
        <div className="min-w-[85vw] lg:min-w-0 snap-center lg:col-span-2 bg-white rounded-2xl lg:rounded-xl shadow-sm border border-border overflow-hidden flex flex-col card-shadow">
          <div className="bg-surface/30 px-5 py-4 border-b border-border">
            <h3 className="font-heading font-semibold text-foreground">Performance Overview</h3>
          </div>
          <div className="p-4 lg:p-6 flex-1 min-h-[250px] lg:min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockAreaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2872A1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2872A1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CBDDE9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#CBDDE9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBDDE9" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5C7F94', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#5C7F94', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #CBDDE9', boxShadow: '0 4px 20px -2px rgba(203, 221, 233, 0.4)', padding: '8px 12px' }}
                  itemStyle={{ color: '#1A2F3E', fontWeight: 600 }}
                  labelStyle={{ color: '#5C7F94', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="logins" stroke="#2872A1" strokeWidth={3} fillOpacity={1} fill="url(#colorLogins)" />
                <Area type="monotone" dataKey="approved" stroke="#CBDDE9" strokeWidth={3} fillOpacity={1} fill="url(#colorApproved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart Card */}
        <div className="min-w-[85vw] lg:min-w-0 snap-center lg:col-span-1 bg-white rounded-2xl lg:rounded-xl shadow-sm border border-border overflow-hidden flex flex-col card-shadow">
          <div className="bg-surface/30 px-5 py-4 border-b border-border">
            <h3 className="font-heading font-semibold text-foreground">In Process</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[250px] lg:min-h-[300px]">
            {stats.inProcessTags && stats.inProcessTags.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.inProcessTags.map((tag: any) => ({ name: tag.tag, value: tag.count }))}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                      {stats.inProcessTags.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #CBDDE9' }}
                      itemStyle={{ color: '#1A2F3E', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="w-full mt-4 space-y-2 px-2">
                  {stats.inProcessTags?.slice(0, 3).map((tag: any, i: number) => (
                    <div key={tag.tag} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length] }}></div>
                        <span className="text-muted-foreground font-medium truncate max-w-[120px]">{tag.tag}</span>
                      </div>
                      <span className="font-bold text-foreground">{tag.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                <PieChartIcon size={32} className="opacity-20" />
                <p>No in-process data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lists / Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-2 pb-6">
        
        {/* List 1 */}
        <div className="bg-white border border-border rounded-2xl lg:rounded-xl shadow-sm overflow-hidden flex flex-col card-shadow">
          <div className="bg-surface/30 px-5 py-4 border-b border-border">
            <h3 className="font-heading font-semibold text-primary">Login Bank Wise</h3>
          </div>
          <div className="p-4 lg:p-0">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/30 text-primary border-b border-border">
                  <tr>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Bank/NBFC</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs text-right">Login Count</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.loginBankWise?.map((bank: any, i: number) => (
                    <tr key={i} className="border-b border-border hover:bg-background/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{bank.bankName}</td>
                      <td className="px-5 py-3 font-mono font-bold text-right text-primary">{bank.count}</td>
                    </tr>
                  ))}
                  {(!stats.loginBankWise || stats.loginBankWise.length === 0) && (
                    <tr><td colSpan={2} className="px-5 py-8 text-center text-muted-foreground text-sm">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {stats.loginBankWise?.map((bank: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-border text-primary shrink-0">
                      <Building2 size={16} />
                    </div>
                    <span className="font-semibold text-sm text-foreground truncate">{bank.bankName}</span>
                  </div>
                  <span className="font-mono font-bold text-lg text-primary">{bank.count}</span>
                </div>
              ))}
              {(!stats.loginBankWise || stats.loginBankWise.length === 0) && (
                <div className="py-8 text-center text-muted-foreground text-sm">No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* List 2 */}
        <div className="bg-white border border-border rounded-2xl lg:rounded-xl shadow-sm overflow-hidden flex flex-col card-shadow">
          <div className="bg-surface/30 px-5 py-4 border-b border-border">
            <h3 className="font-heading font-semibold text-primary">Disbursement Details</h3>
          </div>
          <div className="p-4 lg:p-0">
             {/* Desktop Table View */}
             <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/30 text-primary border-b border-border">
                  <tr>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Bank/NBFC</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs text-right">Amount Disbursed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.disbursementBankWise?.map((bank: any, i: number) => (
                    <tr key={i} className="border-b border-border hover:bg-background/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{bank.bankName}</td>
                      <td className="px-5 py-3 font-mono font-bold text-right text-primary">₹{(bank.amount / 100000).toFixed(2)}L</td>
                    </tr>
                  ))}
                  {(!stats.disbursementBankWise || stats.disbursementBankWise.length === 0) && (
                    <tr><td colSpan={2} className="px-5 py-8 text-center text-muted-foreground text-sm">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {stats.disbursementBankWise?.map((bank: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-border text-primary shrink-0">
                      <IndianRupee size={16} />
                    </div>
                    <span className="font-semibold text-sm text-foreground truncate">{bank.bankName}</span>
                  </div>
                  <span className="font-mono font-bold text-base text-primary">₹{(bank.amount / 100000).toFixed(2)}L</span>
                </div>
              ))}
              {(!stats.disbursementBankWise || stats.disbursementBankWise.length === 0) && (
                <div className="py-8 text-center text-muted-foreground text-sm">No data available</div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
