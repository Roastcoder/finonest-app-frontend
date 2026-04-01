import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Download, Filter, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

const ENTRY_PURPOSES = [
  'LOAN DISBURSEMENT PAYMENT',
  'LOAN CLOSURE PAYMENT',
  'CUSTOMER PAYMENT',
  'RTO PAYMENT',
  'OTHER PAYMENT'
];

export default function AccountPayments() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryData, setEntryData] = useState({
    txn_type: '',
    utr_no: '',
    amount: '',
    credit_debit: 'debit',
    remarks: ''
  });

  const { data: payments } = useQuery({
    queryKey: ['account-payments', user?.id, filterStatus, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ status: filterStatus });
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/accountant/payments?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!user,
  });

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/accountant/payments/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(entryData)
      });
      if (response.ok) {
        toast.success('Entry submitted for approval');
        setShowEntryForm(false);
        setEntryData({ txn_type: '', utr_no: '', amount: '', credit_debit: 'debit', remarks: '' });
      }
    } catch (error) {
      toast.error('Failed to add entry');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/accountant/payments/export`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'payments.csv';
        a.click();
        toast.success('Payments exported');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const pendingRequests = payments?.filter((p: any) => p.status === 'pending') || [];
  const adminPending = payments?.filter((p: any) => p.status === 'admin_pending') || [];
  const approved = payments?.filter((p: any) => p.status === 'approved') || [];

  const totalAmount = payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Payments</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEntryForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={18} />
              Add New Entry
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="admin_pending">Admin Pending</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="w-full bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{payments?.length || 0}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{(totalAmount / 100000).toFixed(2)}L</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingRequests.length}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approved.length}</p>
            </div>
          </div>
        </div>

        {/* PENDING REQUESTS */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-yellow-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pending Requests</h2>
              <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold">
                {pendingRequests.length}
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Purpose</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">UTR</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {pendingRequests.map((payment: any) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.txn_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">₹{(payment.amount / 100000).toFixed(2)}L</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.utr_reference || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN APPROVAL PENDING */}
        {adminPending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Approval Pending</h2>
              <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-semibold">
                {adminPending.length}
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Purpose</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">UTR</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Submitted By</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {adminPending.map((payment: any) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.txn_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">₹{(payment.amount / 100000).toFixed(2)}L</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.utr_reference || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.submitted_by || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            Pending
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* APPROVED */}
        {approved.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={20} className="text-green-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Approved</h2>
              <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                {approved.length}
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Purpose</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">UTR</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Approved By</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {approved.map((payment: any) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.txn_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">₹{(payment.amount / 100000).toFixed(2)}L</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.utr_reference || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.approved_by || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Approved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Entry</h2>
              <button onClick={() => setShowEntryForm(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose</label>
                <select
                  value={entryData.txn_type}
                  onChange={(e) => setEntryData({ ...entryData, txn_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Purpose</option>
                  {ENTRY_PURPOSES.map(purpose => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UTR Number</label>
                <input
                  type="text"
                  value={entryData.utr_no}
                  onChange={(e) => setEntryData({ ...entryData, utr_no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                <input
                  type="number"
                  value={entryData.amount}
                  onChange={(e) => setEntryData({ ...entryData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credit/Debit</label>
                <select
                  value={entryData.credit_debit}
                  onChange={(e) => setEntryData({ ...entryData, credit_debit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <textarea
                  value={entryData.remarks}
                  onChange={(e) => setEntryData({ ...entryData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Submit for Approval
                </button>
                <button
                  type="button"
                  onClick={() => setShowEntryForm(false)}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
