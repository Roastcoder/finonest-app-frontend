import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';

const ENTRY_PURPOSES = [
  'LOAN DISBURSEMENT PAYMENT',
  'LOAN CLOSURE PAYMENT',
  'CUSTOMER PAYMENT',
  'RTO PAYMENT',
  'OTHER PAYMENT'
];

const DUMMY_FOLIOS = [
  {
    id: 1,
    rc_number: 'RC-2024-001',
    customer_name: 'Rajesh Kumar',
    lender: 'HDFC Bank',
    dsa: 'Amit Singh',
    current_balance: 500000000
  },
  {
    id: 2,
    rc_number: 'RC-2024-002',
    customer_name: 'Priya Sharma',
    lender: 'ICICI Bank',
    dsa: 'Neha Patel',
    current_balance: 750000000
  },
  {
    id: 3,
    rc_number: 'RC-2024-003',
    customer_name: 'Vikram Desai',
    lender: 'Axis Bank',
    dsa: 'Rohan Gupta',
    current_balance: 1200000000
  }
];

const DUMMY_LEDGER: Record<number, any[]> = {
  1: [
    {
      id: 1,
      date: '2025-01-10',
      txn_type: 'LOAN DISBURSEMENT PAYMENT',
      utr_no: 'UTR123456',
      amount: 100000000,
      credit_debit: 'credit',
      balance: 500000000,
      remarks: 'Initial disbursement',
      status: 'approved'
    },
    {
      id: 2,
      date: '2025-01-12',
      txn_type: 'CUSTOMER PAYMENT',
      utr_no: 'UTR123457',
      amount: 50000000,
      credit_debit: 'debit',
      balance: 450000000,
      remarks: 'Customer payment received',
      status: 'approved'
    },
    {
      id: 3,
      date: '2025-01-15',
      txn_type: 'RTO PAYMENT',
      utr_no: 'UTR123458',
      amount: 25000000,
      credit_debit: 'debit',
      balance: 425000000,
      remarks: 'RTO payment',
      status: 'pending'
    }
  ],
  2: [
    {
      id: 4,
      date: '2025-01-08',
      txn_type: 'LOAN DISBURSEMENT PAYMENT',
      utr_no: 'UTR123459',
      amount: 150000000,
      credit_debit: 'credit',
      balance: 750000000,
      remarks: 'Disbursement',
      status: 'approved'
    },
    {
      id: 5,
      date: '2025-01-14',
      txn_type: 'LOAN CLOSURE PAYMENT',
      utr_no: 'UTR123460',
      amount: 75000000,
      credit_debit: 'debit',
      balance: 675000000,
      remarks: 'Loan closure',
      status: 'approved'
    }
  ],
  3: [
    {
      id: 6,
      date: '2025-01-05',
      txn_type: 'LOAN DISBURSEMENT PAYMENT',
      utr_no: 'UTR123461',
      amount: 200000000,
      credit_debit: 'credit',
      balance: 1200000000,
      remarks: 'Initial disbursement',
      status: 'approved'
    },
    {
      id: 7,
      date: '2025-01-11',
      txn_type: 'OTHER PAYMENT',
      utr_no: 'UTR123462',
      amount: 30000000,
      credit_debit: 'debit',
      balance: 1170000000,
      remarks: 'Miscellaneous payment',
      status: 'approved'
    },
    {
      id: 8,
      date: '2025-01-16',
      txn_type: 'CUSTOMER PAYMENT',
      utr_no: '',
      amount: 60000000,
      credit_debit: 'debit',
      balance: 1110000000,
      remarks: 'Pending approval',
      status: 'pending'
    }
  ]
};

export default function FolioAccounts() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolio, setExpandedFolio] = useState<number | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [selectedFolioId, setSelectedFolioId] = useState<number | null>(null);
  const [entryData, setEntryData] = useState({
    txn_type: '',
    utr_no: '',
    amount: '',
    credit_debit: 'debit',
    remarks: ''
  });

  const { data: folios } = useQuery({
    queryKey: ['folio-accounts', user?.id, searchTerm],
    queryFn: async () => {
      if (!searchTerm) return DUMMY_FOLIOS;
      return DUMMY_FOLIOS.filter(f => 
        f.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.rc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.lender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.dsa.toLowerCase().includes(searchTerm.toLowerCase())
      );
    },
    enabled: !!user,
  });

  const { data: ledgerEntries } = useQuery({
    queryKey: ['folio-ledger', expandedFolio],
    queryFn: async () => {
      if (!expandedFolio) return [];
      return DUMMY_LEDGER[expandedFolio] || [];
    },
    enabled: !!expandedFolio,
  });

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Entry submitted for approval');
    setShowEntryForm(false);
    setEntryData({ txn_type: '', utr_no: '', amount: '', credit_debit: 'debit', remarks: '' });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Folio Accounts</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by Customer Name / RC Number / Lender / DSA / Date"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Folio Accounts List */}
        <div className="space-y-4">
          {folios?.map((folio: any) => (
            <div key={folio.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Folio Header */}
              <button
                onClick={() => setExpandedFolio(expandedFolio === folio.id ? null : folio.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">RC #{folio.rc_number}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{folio.customer_name} • {folio.lender} • {folio.dsa}</p>
                  </div>
                </div>
                <div className="text-right mr-4">
                  <p className="font-bold text-gray-900 dark:text-white">₹{(folio.current_balance / 100000).toFixed(2)}L</p>
                  <p className="text-xs text-gray-500">Balance</p>
                </div>
                {expandedFolio === folio.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {/* Expanded Ledger */}
              {expandedFolio === folio.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  {/* Ledger Table */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Date</th>
                          <th className="px-4 py-2 text-left font-semibold">Txn Type</th>
                          <th className="px-4 py-2 text-left font-semibold">UTR No</th>
                          <th className="px-4 py-2 text-right font-semibold">Amount</th>
                          <th className="px-4 py-2 text-center font-semibold">C/D</th>
                          <th className="px-4 py-2 text-right font-semibold">Balance</th>
                          <th className="px-4 py-2 text-left font-semibold">Remarks</th>
                          <th className="px-4 py-2 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {ledgerEntries?.map((entry: any) => (
                          <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-2">{new Date(entry.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{entry.txn_type}</td>
                            <td className="px-4 py-2">{entry.utr_no || '-'}</td>
                            <td className="px-4 py-2 text-right">₹{(entry.amount / 100000).toFixed(2)}L</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                entry.credit_debit === 'credit' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {entry.credit_debit === 'credit' ? 'CR' : 'DR'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right font-semibold">₹{(entry.balance / 100000).toFixed(2)}L</td>
                            <td className="px-4 py-2 text-sm">{entry.remarks || '-'}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                entry.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {entry.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Entry Button */}
                  <button
                    onClick={() => {
                      setSelectedFolioId(folio.id);
                      setShowEntryForm(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                    Add New Entry
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
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
