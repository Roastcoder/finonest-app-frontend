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
import FeatureCarousel from '@/components/FeatureCarousel';

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
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 text-text-main-light dark:text-text-main-dark">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          
          {/* Timeline Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={18} className="text-gray-500" />
            <select 
              value={timeline} 
              onChange={(e) => setTimeline(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_month">This Month</option>
              <option value="custom">Date Range</option>
            </select>
            
            {timeline === 'custom' && (
              <>
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
                <span className="text-gray-500">to</span>
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </>
            )}
          </div>
        </div>

        {/* Feature Carousel Banner - Keep Existing */}
        <div className="mb-6">
          <FeatureCarousel />
        </div>

        {/* Section 1: Login Bank Wise */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Login Bank Wise (No of Apps)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.loginBankWise?.map((bank: any) => (
              <div key={bank.bankName} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{bank.bankName}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bank.count}</p>
              </div>
            ))}
            {(!stats.loginBankWise || stats.loginBankWise.length === 0) && (
              <div className="col-span-full text-center text-gray-500 py-8">No login data available</div>
            )}
          </div>
        </div>

        {/* Section 2: ABND Bank Wise */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">ABND - Approved But Not Disbursed (Loan Amount)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.abndBankWise?.map((bank: any) => (
              <div key={bank.bankName} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{bank.bankName}</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">₹{(bank.amount / 100000).toFixed(2)}L</p>
              </div>
            ))}
            {(!stats.abndBankWise || stats.abndBankWise.length === 0) && (
              <div className="col-span-full text-center text-gray-500 py-8">No ABND data available</div>
            )}
          </div>
        </div>

        {/* Section 3: Disbursement Bank Wise */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Disbursement Bank Wise (Loan Amount)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.disbursementBankWise?.map((bank: any) => (
              <div key={bank.bankName} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{bank.bankName}</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">₹{(bank.amount / 100000).toFixed(2)}L</p>
              </div>
            ))}
            {(!stats.disbursementBankWise || stats.disbursementBankWise.length === 0) && (
              <div className="col-span-full text-center text-gray-500 py-8">No disbursement data available</div>
            )}
          </div>
        </div>

        {/* Section 4: PDD Tracker */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">PDD Tracker (Post Disbursal Days)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {['0-30', '31-45', '46-60', '61-90', '90+'].map((range) => (
              <div key={range} className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{range} days</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.pddTracker?.[range] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Monthly Application Tracker */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Month Application Tracker</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Login</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.monthlyTracker?.login || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Units</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">In Process</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.monthlyTracker?.inProcess || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Units</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.monthlyTracker?.approved?.units || 0}</p>
              <p className="text-xs text-gray-500 mt-1">₹{((stats.monthlyTracker?.approved?.amount || 0) / 100000).toFixed(2)}L</p>
            </div>
            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Disbursed</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{stats.monthlyTracker?.disbursed?.units || 0}</p>
              <p className="text-xs text-gray-500 mt-1">₹{((stats.monthlyTracker?.disbursed?.amount || 0) / 100000).toFixed(2)}L</p>
            </div>
          </div>
        </div>

        {/* Section 6: In Process Apps - Tag Wise */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">In Process Apps (Tag Wise - Clickable)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.inProcessTags?.map((tag: any) => (
              <button
                key={tag.tag}
                onClick={() => navigate(`/loans?stage=in_process&tag=${encodeURIComponent(tag.tag)}`)}
                className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-left"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{tag.tag}</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{tag.count}</p>
              </button>
            ))}
            {(!stats.inProcessTags || stats.inProcessTags.length === 0) && (
              <div className="col-span-full text-center text-gray-500 py-8">No in-process applications</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
