import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

import LoanStatusBadge from '@/components/LoanStatusBadge';
import { formatCurrency, LEAD_STATUSES } from '@/lib/mock-data';
import { ROLE_LABELS } from '@/lib/auth';
import { FileText, IndianRupee, CheckCircle2, Clock, Building2, MapPin, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import FeatureCarousel from '@/components/FeatureCarousel';

const STATUS_CHART_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#6b7280'];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-stats', user?.branch_id],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/dashboard?startDate=${today}&endDate=${today}`, {
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

  const { data: branchInfo } = useQuery({
    queryKey: ['branch-info', user?.branch_id],
    queryFn: async () => {
      if (!user?.branch_id) return null;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches/${user.branch_id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    enabled: !!user?.branch_id,
  });

  if (!user) return null;

  const stats = dashboardData || { loginStats: [], abnd: 0, disbursement: 0, pddTracker: [] };
  const recentLeads = [];
  const leadsByStatus = [];

  const bankLoginData = stats.loginStats?.map((item: any) => ({
    name: item.bank_name,
    count: parseInt(item.login_count)
  })) || [];

  const statusData = LEAD_STATUSES.map(s => {
    const statMatch = leadsByStatus.find((ls: any) => ls.status === s.value);
    return {
      name: s.label,
      value: statMatch ? parseInt(statMatch.count) : 0,
    };
  }).filter(d => d.value > 0);

  // Derive top banks directly from recentLeads array or map 0s if empty
  const bankNames = [...new Set(recentLeads.map((l: any) => l.bank_name).filter(Boolean))];
  const bankData = bankNames.map(bank => ({
    name: (bank as string).replace(' Bank', ''),
    amount: recentLeads.filter((l: any) => l.bank_name === bank).reduce((s: number, l: any) => s + Number(l.loan_amount), 0) / 100000,
  }));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 text-text-main-light dark:text-text-main-dark">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <button className="glass-card flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors">
            <span className="text-text-muted-light dark:text-text-muted-dark">Current Month</span>
          </button>
        </div>

        {/* Feature Carousel Banner - Keep Existing */}
        <div className="mb-6">
          <FeatureCarousel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Section - Bank-wise Login */}
          <div className="stat-card lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Bank-wise Login Stats</h2>
              <Link to="/loans" className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="flex-1 flex min-h-[250px] w-full h-[250px]">
              {bankLoginData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bankLoginData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted-light)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted-light)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '12px', fontSize: '13px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">No login data yet</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="stat-card">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">ABND (Approved But Not Disbursed)</h2>
              <div className="text-3xl font-bold text-amber-600">{stats.abnd || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Pending Disbursement</div>
            </div>

            <div className="stat-card">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Disbursements</h2>
              <div className="text-3xl font-bold text-green-600">{stats.disbursement || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Successfully Disbursed</div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* PDD Tracker */}
          <div className="stat-card">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">PDD Tracker (Days Pending)</h2>
            <div className="space-y-3">
              {stats.pddTracker?.map((bucket: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{bucket.bucket}</span>
                  <span className="text-lg font-bold text-primary">{bucket.count}</span>
                </div>
              ))}
              {(!stats.pddTracker || stats.pddTracker.length === 0) && (
                <div className="text-center text-muted-foreground text-sm py-8">No pending disbursements</div>
              )}
            </div>
          </div>

          <div className="stat-card flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/add-lead" className="block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <div className="font-semibold text-blue-700 dark:text-blue-300">Create New Lead</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Add customer details</div>
              </Link>
              <Link to="/leads-list" className="block p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                <div className="font-semibold text-green-700 dark:text-green-300">View All Leads</div>
                <div className="text-sm text-green-600 dark:text-green-400">Manage pipeline</div>
              </Link>
              <Link to="/reports" className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                <div className="font-semibold text-purple-700 dark:text-purple-300">View Reports</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Analytics & insights</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
