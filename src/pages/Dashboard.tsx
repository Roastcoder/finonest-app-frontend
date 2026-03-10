import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

import LoanStatusBadge from '@/components/LoanStatusBadge';
import { formatCurrency, LEAD_STATUSES } from '@/lib/mock-data';
import { ROLE_LABELS } from '@/lib/auth';
import { FileText, IndianRupee, CheckCircle2, Clock, Building2, MapPin, ChevronRight, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

const STATUS_CHART_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#6b7280'];

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

  const stats = dashboardData || {
    loginBankWise: [],
    abndBankWise: [],
    disbursementBankWise: [],
    pddTracker: {},
    monthlyTracker: { login: 0, inProcess: 0, approved: { units: 0, amount: 0 }, disbursed: { units: 0, amount: 0 } },
    inProcessTags: []
  };



  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 text-text-main-light dark:text-text-main-dark bg-gray-50 dark:bg-gray-900/50">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          {/* Timeline Filter */}
          <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 ml-auto">
            <Calendar size={18} className="text-gray-500 ml-2" />
            <select
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="px-2 py-1.5 rounded-xl border-0 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_month">This Month</option>
              <option value="custom">Date Range</option>
            </select>

            {timeline === 'custom' && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Overview Cards (Moved from Monthly Application Tracker) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Primary Green Card - Logins */}
          <div className="p-6 bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-6 right-6 p-2 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm group-hover:bg-white/20 transition-colors">
              <ChevronRight size={18} className="-rotate-45" />
            </div>
            <p className="text-white/80 font-medium text-lg mb-4">Total Logins</p>
            <p className="text-6xl font-medium tracking-tight text-white mb-6">
              {stats.monthlyTracker?.login || 0}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-white text-sm">
              <span className="text-green-300">↑</span>
              <span>Units</span>
            </div>
          </div>

          {/* White Card - In Process */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative group transition-all hover:shadow-md hover:border-gray-200">
            <div className="absolute top-6 right-6 p-2 rounded-full border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 transition-colors">
              <ChevronRight size={18} className="-rotate-45" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-lg mb-4">In Process</p>
            <p className="text-6xl font-medium tracking-tight text-gray-900 dark:text-white mb-6">
              {stats.monthlyTracker?.inProcess || 0}
            </p>
            <div className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm">
              <Clock size={16} />
              <span>Units active</span>
            </div>
          </div>

          {/* White Card - Approved */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative group transition-all hover:shadow-md hover:border-gray-200">
            <div className="absolute top-6 right-6 p-2 rounded-full border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 transition-colors">
              <ChevronRight size={18} className="-rotate-45" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-lg mb-4">Approved</p>
            <p className="text-6xl font-medium tracking-tight text-gray-900 dark:text-white mb-6">
              {stats.monthlyTracker?.approved?.units || 0}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium">
              <span>₹{((stats.monthlyTracker?.approved?.amount || 0) / 100000).toFixed(2)}L</span>
              <span className="text-green-600/70 font-normal ml-1">Volume</span>
            </div>
          </div>

          {/* White Card - Disbursed */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative group transition-all hover:shadow-md hover:border-gray-200">
            <div className="absolute top-6 right-6 p-2 rounded-full border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 transition-colors">
              <ChevronRight size={18} className="-rotate-45" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-lg mb-4">Disbursed</p>
            <p className="text-6xl font-medium tracking-tight text-gray-900 dark:text-white mb-6">
              {stats.monthlyTracker?.disbursed?.units || 0}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-medium">
              <span>₹{((stats.monthlyTracker?.disbursed?.amount || 0) / 100000).toFixed(2)}L</span>
              <span className="text-blue-600/70 font-normal ml-1">Volume</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Section 2: Login Bank Wise */}
          <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight mb-6">Login Bank Wise</h2>
            <div className="grid grid-cols-2 gap-4">
              {stats.loginBankWise?.map((bank: any) => (
                <div key={bank.bankName} className="p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 truncate">{bank.bankName}</p>
                  <p className="text-3xl font-medium tracking-tight text-gray-900 dark:text-white">{bank.count}</p>
                </div>
              ))}
              {(!stats.loginBankWise || stats.loginBankWise.length === 0) && (
                <div className="col-span-full text-center text-gray-500 py-6">No login data available</div>
              )}
            </div>
          </div>

          {/* Section 3: In Process Apps - Tag Wise */}
          <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight mb-6">In Process Breakdown</h2>
            <div className="grid grid-cols-2 gap-4">
              {stats.inProcessTags?.map((tag: any) => (
                <button
                  key={tag.tag}
                  onClick={() => navigate(`/loans?stage=in_process&tag=${encodeURIComponent(tag.tag)}`)}
                  className="p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-left hover:border-[#2d6a4f] transition-colors group"
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 truncate group-hover:text-[#2d6a4f] transition-colors">{tag.tag}</p>
                  <p className="text-3xl font-medium tracking-tight text-gray-900 dark:text-white">{tag.count}</p>
                </button>
              ))}
              {(!stats.inProcessTags || stats.inProcessTags.length === 0) && (
                <div className="col-span-full text-center text-gray-500 py-6">No in-process applications</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: ABND & Disbursed Bank Wise */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              ABND Details
            </h2>
            <div className="space-y-4">
              {stats.abndBankWise?.map((bank: any) => (
                <div key={bank.bankName} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                  <p className="font-medium text-gray-600 dark:text-gray-300">{bank.bankName}</p>
                  <p className="text-xl font-medium tracking-tight text-gray-900 dark:text-white">₹{(bank.amount / 100000).toFixed(2)}L</p>
                </div>
              ))}
              {(!stats.abndBankWise || stats.abndBankWise.length === 0) && (
                <div className="text-center text-gray-500 py-6">No ABND data available</div>
              )}
            </div>
          </div>

          <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2d6a4f]"></span>
              Disbursement Details
            </h2>
            <div className="space-y-4">
              {stats.disbursementBankWise?.map((bank: any) => (
                <div key={bank.bankName} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                  <p className="font-medium text-gray-600 dark:text-gray-300">{bank.bankName}</p>
                  <p className="text-xl font-medium tracking-tight text-[#2d6a4f] dark:text-green-400">₹{(bank.amount / 100000).toFixed(2)}L</p>
                </div>
              ))}
              {(!stats.disbursementBankWise || stats.disbursementBankWise.length === 0) && (
                <div className="text-center text-gray-500 py-6">No disbursement data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: PDD Tracker */}
        <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight mb-6">PDD Tracker (Days)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['0-30', '31-45', '46-60', '61-90', '90+'].map((range, i) => {
              // Add progressive heat coloring to ranges
              const heatColors = [
                'text-[#2d6a4f]',
                'text-green-600',
                'text-yellow-600',
                'text-orange-500',
                'text-red-600'
              ];
              return (
                <div key={range} className="p-6 bg-gray-50/80 dark:bg-gray-900/50 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition duration-300">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{range}</p>
                  <p className={`text-4xl font-medium tracking-tight ${heatColors[i]}`}>{stats.pddTracker?.[range] || 0}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
