import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { IndianRupee, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AccountantDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['accountant-dashboard', user?.id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!user,
  });

  const dashboardData = stats || {
    totalDisbursed: 0,
    totalPayouts: 0,
    pendingPayments: 0,
    totalExpenses: 0,
    monthlyData: [],
    paymentStatus: { pending: 0, completed: 0, failed: 0 }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Accountant Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Disbursed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ₹{(dashboardData.totalDisbursed / 100000).toFixed(2)}L
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                <IndianRupee size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Payouts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ₹{(dashboardData.totalPayouts / 100000).toFixed(2)}L
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <TrendingUp size={24} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Pending Payments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ₹{(dashboardData.pendingPayments / 100000).toFixed(2)}L
                </p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                <AlertCircle size={24} className="text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ₹{(dashboardData.totalExpenses / 100000).toFixed(2)}L
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                <CheckCircle2 size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Disbursement Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: any) => `₹${(Number(value) / 100000).toFixed(2)}L`} />
              <Bar dataKey="amount" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{dashboardData.paymentStatus.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Completed</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{dashboardData.paymentStatus.completed}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Failed</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{dashboardData.paymentStatus.failed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
