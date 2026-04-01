import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, CheckCircle2, IndianRupee, PieChart as PieChartIcon, Building2, TrendingUp, Calendar, ArrowUpRight, BarChart3, Target, Download, FileText, Eye, Share2 } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { downloadDashboardPDF } from '@/lib/dashboard-pdf-export';
import Navbar from '@/components/Navbar';
import { ScrollSection } from '@/components/ScrollSection';

const STATUS_CHART_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface DashboardContextType {
  timeline: string;
  setTimeline: (value: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (value: { start: string; end: string }) => void;
  showExportMenu: boolean;
  setShowExportMenu: (value: boolean) => void;
  isGeneratingPDF: boolean;
  setIsGeneratingPDF: (value: boolean) => void;
  handleExportDashboard?: () => Promise<void>;
  handleViewDashboard?: () => Promise<void>;
  handleShareDashboard?: () => Promise<void>;
}

export const DashboardContext = React.createContext<DashboardContextType | null>(null);

export const useDashboardContext = () => {
  const context = React.useContext(DashboardContext);
  if (!context) throw new Error('useDashboardContext must be used within Dashboard');
  return context;
};

export const useDashboardContextSafe = () => {
  return React.useContext(DashboardContext);
};

const DASHBOARD_TITLES: { [key in UserRole]: string } = {
  admin: 'Admin Dashboard',
  manager: 'Manager Dashboard',
  sales_manager: 'Sales Manager Dashboard',
  branch_manager: 'Branch Manager Dashboard',
  dsa: 'DSA Dashboard',
  team_leader: 'Team Leader Dashboard',
  executive: 'Executive Dashboard',
};

const ROLE_BASED_COMPONENTS: { [key in UserRole]: string[] } = {
  admin: ['loginVolume', 'disbursement', 'approvedLoans', 'performanceChart', 'stageDistribution', 'bankDistribution', 'statusDistribution'],
  manager: ['loginVolume', 'disbursement', 'approvedLoans', 'performanceChart', 'stageDistribution'],
  sales_manager: ['loginVolume', 'approvedLoans', 'performanceChart'],
  branch_manager: ['loginVolume', 'disbursement', 'approvedLoans', 'stageDistribution'],
  dsa: ['approvedLoans', 'performanceChart'],
  team_leader: ['loginVolume', 'approvedLoans', 'performanceChart'],
  executive: ['disbursement', 'approvedLoans', 'statusDistribution', 'bankDistribution'],
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState('this_month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [permissions, setPermissions] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data: userPermissions } = useQuery({
    queryKey: ['user-permissions', user?.role],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/permissions`, {
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

  useEffect(() => {
    if (userPermissions?.permissions) {
      console.log('Dashboard permissions loaded:', userPermissions.permissions);
      setPermissions(userPermissions.permissions);
    }
  }, [userPermissions]);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.branch_id, timeline, dateRange],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ timeline });
        if (timeline === 'custom' && dateRange.start && dateRange.end) {
          params.append('startDate', dateRange.start);
          params.append('endDate', dateRange.end);
        }
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/dashboard/stats?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        console.error('Dashboard stats error:', error);
        return null;
      }
    },
    enabled: !!user,
  });

  if (!user) return null;

  const stats = dashboardData || {
    loginBankWise: [
      { bankName: 'HDFC Bank', count: 45 },
      { bankName: 'ICICI Bank', count: 38 },
      { bankName: 'Axis Bank', count: 32 },
      { bankName: 'SBI', count: 28 },
      { bankName: 'Kotak Bank', count: 22 }
    ],
    disbursementBankWise: [
      { bankName: 'HDFC Bank', amount: 4500000 },
      { bankName: 'ICICI Bank', amount: 3800000 },
      { bankName: 'Axis Bank', amount: 3200000 },
      { bankName: 'SBI', amount: 2800000 },
      { bankName: 'Kotak Bank', amount: 2200000 }
    ],
    approvedBankWise: [
      { bankName: 'HDFC Bank', amount: 5500000, units: 12 },
      { bankName: 'ICICI Bank', amount: 4200000, units: 10 },
      { bankName: 'Axis Bank', amount: 3800000, units: 8 },
      { bankName: 'SBI', amount: 3200000, units: 7 },
      { bankName: 'Kotak Bank', amount: 2800000, units: 6 }
    ],
    pddTracker: {},
    stageBreakdown: [
      { stage: 'LOGIN', count: 45 },
      { stage: 'IN_PROCESS', count: 32 },
      { stage: 'APPROVED', count: 28 },
      { stage: 'DISBURSED', count: 22 },
      { stage: 'REJECTED', count: 8 }
    ],
    monthlyTracker: { 
      login: 135, 
      inProcess: 32, 
      approved: { units: 28, amount: 19500000 }, 
      disbursed: { units: 22, amount: 15500000 } 
    },
    inProcessTags: [
      { tag: 'Pending Follow-up', count: 12 },
      { tag: 'Awaiting Documents', count: 8 },
      { tag: 'Under Review', count: 12 }
    ]
  };

  const dashboardTitle = user.role ? DASHBOARD_TITLES[user.role] : 'Dashboard';

  useEffect(() => {
    if (isGeneratingPDF) {
      const executeExport = async () => {
        try {
          await downloadDashboardPDF({
            title: dashboardTitle,
            timeline: timeline,
            dateRange: timeline === 'custom' ? dateRange : undefined,
            stats: stats,
            user: user
          });
        } catch (error) {
          console.error('PDF generation error:', error);
          alert('Failed to generate PDF. Please try again.');
        } finally {
          setIsGeneratingPDF(false);
        }
      };
      executeExport();
    }
  }, [isGeneratingPDF]);

  const handleViewDashboard = async () => {
    try {
      const pdfBlob = await (await import('@/lib/dashboard-pdf-export')).generateDashboardPDF({
        title: dashboardTitle,
        timeline: timeline,
        dateRange: timeline === 'custom' ? dateRange : undefined,
        stats: stats,
        user: user
      });
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('PDF view error:', error);
      alert('Failed to view PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShareDashboard = async () => {
    try {
      const { downloadDashboardPDF } = await import('@/lib/dashboard-pdf-export');
      const pdfBlob = await (await import('@/lib/dashboard-pdf-export')).generateDashboardPDF({
        title: dashboardTitle,
        timeline: timeline,
        dateRange: timeline === 'custom' ? dateRange : undefined,
        stats: stats,
        user: user
      });
      
      const pdfFile = new File([pdfBlob], `dashboard-${new Date().getTime()}.pdf`, { type: 'application/pdf' });
      
      if (navigator.share) {
        await navigator.share({
          title: `Dashboard Report - ${dashboardTitle}`,
          text: `Dashboard Report for ${timeline}`,
          files: [pdfFile]
        });
      } else {
        alert('Sharing not available on this device. Please download the PDF instead.');
      }
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportDashboard = async () => {
    try {
      await downloadDashboardPDF({
        title: dashboardTitle,
        timeline: timeline,
        dateRange: timeline === 'custom' ? dateRange : undefined,
        stats: stats,
        user: user
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const mockAreaData = [
    { name: 'Mon', logins: 40, approved: 20 },
    { name: 'Tue', logins: 70, approved: 40 },
    { name: 'Wed', logins: 120, approved: 60 },
    { name: 'Thu', logins: 150, approved: 80 },
    { name: 'Fri', logins: 220, approved: 120 },
    { name: 'Sat', logins: 140, approved: 70 },
    { name: 'Sun', logins: 80, approved: 40 },
  ];

  const stageDistribution = stats.stageBreakdown?.filter((s: any) => s.stage === 'LOGIN' || s.stage === 'DISBURSED').map((s: any) => ({
    name: s.stage,
    value: s.count
  })) || [];

  const bankDistribution = stats.loginBankWise?.slice(0, 5).map((b: any) => ({
    name: b.bankName?.substring(0, 10),
    value: b.count
  })) || [];

  const approvedCount = stats.monthlyTracker?.approved?.units || 0;
  const disbursedCount = stats.monthlyTracker?.disbursed?.units || 0;
  const pendingDisbursement = approvedCount - disbursedCount;

  const statusDistribution = [
    { name: 'Approved', value: approvedCount },
    { name: 'Pending Disbursement', value: pendingDisbursement },
    { name: 'Disbursed', value: disbursedCount },
  ];

  const chartCardClass = "bg-white dark:bg-gray-900/40 rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300";
  const headerClass = "px-3 py-2 border-b border-border/50 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20";

  const handleNavigateToLoans = (stage: string) => {
    navigate(`/loans?stage=${stage}`);
  };

  const canViewComponent = (componentKey: string): boolean => {
    if (isAdmin) return true;
    if (!permissions?.dashboard?.components) return false;
    return permissions.dashboard.components[componentKey] === true;
  };

  const getRoleBasedStats = () => {
    if (!user?.role) return stats;
    const roleStats = { ...stats };
    if (user.role === 'dsa') {
      roleStats.loginBankWise = stats.loginBankWise?.slice(0, 2) || [];
      roleStats.disbursementBankWise = stats.disbursementBankWise?.slice(0, 2) || [];
    } else if (user.role === 'team_leader') {
      roleStats.loginBankWise = stats.loginBankWise?.slice(0, 3) || [];
    } else if (user.role === 'branch_manager') {
      roleStats.loginBankWise = stats.loginBankWise?.slice(0, 4) || [];
    }
    return roleStats;
  };

  const roleBasedStats = getRoleBasedStats();
  const roleBasedComponents = ROLE_BASED_COMPONENTS[user?.role || 'dsa'] || [];

  const isAdmin = user?.role === 'admin';
  const canViewDashboard = isAdmin || permissions?.dashboard?.view !== false;
  const canExportDashboard = isAdmin || permissions?.dashboard?.export === true;

  if (!canViewDashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">You don't have permission to view this dashboard</p>
        </div>
      </div>
    );
  }

  const contextValue: DashboardContextType = {
    timeline,
    setTimeline,
    dateRange,
    setDateRange,
    showExportMenu,
    setShowExportMenu,
    isGeneratingPDF,
    setIsGeneratingPDF,
    handleExportDashboard,
    handleViewDashboard,
    handleShareDashboard
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <Navbar 
        title="Admin Dashboard"
        showTimeline={true}
        showExport={true}
        showNotifications={true}
        showProfile={true}
      />
      <div className="flex flex-col gap-3 lg:gap-4 w-full pb-6" style={{ padding: '0.5rem 0', paddingBottom: 'clamp(5rem, 10vh, 1.25rem)', marginTop: '5vh' }}>
        {/* KPI Cards Grid */}
        <ScrollSection delay={0} className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 w-full">
          <div className="bg-white dark:bg-gray-900/40 rounded-xl p-2.5 border border-border/50 shadow-sm hover:shadow-md transition-all group cursor-default">
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary group-hover:scale-110 transition-transform">
                <Users size={13} />
              </div>
              <ArrowUpRight size={10} className="text-emerald-500 opacity-50" />
            </div>
            <div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Logins</p>
              <h4 className="text-lg font-black text-foreground mt-0.5">{stats.monthlyTracker?.login || 0}</h4>
              <p className="text-[8px] text-emerald-600 font-bold mt-1 flex items-center gap-0.5">
                <TrendingUp size={7} /> +12%
              </p>
            </div>
          </div>

          <button 
            onClick={() => handleNavigateToLoans('IN_PROCESS')}
            className="bg-white dark:bg-gray-900/40 rounded-xl p-2.5 border border-border/50 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group cursor-pointer text-left"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                <Clock size={13} />
              </div>
            </div>
            <div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">In Process</p>
              <h4 className="text-lg font-black text-foreground mt-0.5">{stats.monthlyTracker?.inProcess || 0}</h4>
              <p className="text-[8px] text-amber-600 font-bold mt-1">Click to view</p>
            </div>
          </button>

          <button 
            onClick={() => handleNavigateToLoans('APPROVED')}
            className="bg-white dark:bg-gray-900/40 rounded-xl p-2.5 border border-border/50 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group cursor-pointer text-left"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={13} />
              </div>
            </div>
            <div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Approved</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <h4 className="text-lg font-black text-foreground">{stats.monthlyTracker?.approved?.units || 0}</h4>
                <span className="text-[7px] font-bold text-muted-foreground">₹{((stats.monthlyTracker?.approved?.amount || 0) / 100000).toFixed(1)}L</span>
              </div>
              <p className="text-[8px] text-emerald-600 font-bold mt-1">Click to view</p>
            </div>
          </button>

          <button 
            onClick={() => handleNavigateToLoans('DISBURSED')}
            className="bg-white dark:bg-gray-900/40 rounded-xl p-2.5 border border-border/50 shadow-sm hover:shadow-md hover:border-purple-300 transition-all group cursor-pointer text-left"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 group-hover:scale-110 transition-transform">
                <IndianRupee size={13} />
              </div>
            </div>
            <div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Disbursed</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <h4 className="text-lg font-black text-foreground">{stats.monthlyTracker?.disbursed?.units || 0}</h4>
                <span className="text-[7px] font-bold text-muted-foreground">₹{((stats.monthlyTracker?.disbursed?.amount || 0) / 100000).toFixed(1)}L</span>
              </div>
              <p className="text-[8px] text-purple-600 font-bold mt-1">Click to view</p>
            </div>
          </button>
        </ScrollSection>

        {/* Charts Grid */}
        <ScrollSection delay={0.1} className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          {/* Login Volume */}
          {(canViewComponent('loginVolume') || isAdmin) && (
          <div className={chartCardClass}>
            <div className={headerClass}>
              <div className="flex items-center gap-1">
                <Building2 size={13} className="text-primary" />
                <h3 className="font-bold text-xs text-foreground">Login Volume</h3>
              </div>
            </div>
            <div className="p-3 h-[350px]">
              {roleBasedStats.loginBankWise && roleBasedStats.loginBankWise.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleBasedStats.loginBankWise}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="bankName" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 8}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                      cursor={{fill: '#f8fafc'}}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
            </div>
          </div>
          )}

          {/* Disbursement */}
          {(canViewComponent('disbursement') || isAdmin) && (
          <div className={chartCardClass}>
            <div className={headerClass}>
              <div className="flex items-center gap-1">
                <IndianRupee size={13} className="text-primary" />
                <h3 className="font-bold text-xs text-foreground">Disbursement</h3>
              </div>
            </div>
            <div className="p-3 h-[350px]">
              {roleBasedStats.disbursementBankWise && roleBasedStats.disbursementBankWise.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleBasedStats.disbursementBankWise}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="bankName" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 8}} />
                    <Tooltip 
                      formatter={(value: number) => `₹${(value/100000).toFixed(2)}L`}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                      cursor={{fill: '#f8fafc'}}
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[3, 3, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
            </div>
          </div>
          )}
        </ScrollSection>

        {/* Pie Charts Row */}
        <ScrollSection delay={0.2} className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Stage Distribution */}
          {(canViewComponent('stageDistribution') || isAdmin) && (
          <div className={chartCardClass}>
            <div className={headerClass}>
              <div className="flex items-center gap-1">
                <PieChartIcon size={13} className="text-primary" />
                <h3 className="font-bold text-xs text-foreground">Stage Distribution</h3>
              </div>
            </div>
            <div className="p-3 h-[230px] w-[200px] flex items-center justify-center mx-auto">
              {stageDistribution && stageDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stageDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
            </div>
          </div>
          )}

          {/* Bank Distribution */}
          {(canViewComponent('bankDistribution') || isAdmin) && (
          <div className={chartCardClass}>
            <div className={headerClass}>
              <div className="flex items-center gap-1">
                <Building2 size={13} className="text-primary" />
                <h3 className="font-bold text-xs text-foreground">Bank Distribution</h3>
              </div>
            </div>
            <div className="p-3 h-[220px] w-[200px] flex items-center justify-center mx-auto">
              {bankDistribution && bankDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bankDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {bankDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
            </div>
          </div>
          )}

          {/* Status Distribution */}
          {(canViewComponent('statusDistribution') || isAdmin) && (
          <div className={chartCardClass}>
            <div className={headerClass}>
              <div className="flex items-center gap-1">
                <Target size={13} className="text-primary" />
                <h3 className="font-bold text-xs text-foreground">Status Distribution</h3>
              </div>
            </div>
            <div className="p-3 h-[220px] w-[200px] flex items-center justify-center mx-auto">
              {statusDistribution && statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px]">No data</div>}
            </div>
          </div>
          )}
        </ScrollSection>

        {/* Performance Chart */}
        {(canViewComponent('performanceChart') || isAdmin) && (
        <ScrollSection delay={0.3} className={chartCardClass} style={{marginTop:'clamp(-9vh, -7vh, -1rem)',marginBottom:'clamp(-9vh, -1vw, -1vh)'}}>
          <div className={headerClass}>
            <div className="flex items-center gap-1">
              <TrendingUp size={13} className="text-primary" />
              <h3 className="font-bold text-xs text-foreground">Performance Trend</h3>
            </div>
          </div>
          <div style={{ height: 'clamp(250px, 50vw, 500px)', width: '100%'}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockAreaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} >
                <defs>
                  <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)', padding: '8px', fontSize: '12px' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="logins" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLogins)" />
                <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorApproved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ScrollSection>
        )}
      </div>
    </DashboardContext.Provider>
  );
}
