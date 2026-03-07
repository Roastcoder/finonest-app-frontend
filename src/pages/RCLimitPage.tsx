import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function RCLimitPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'dsa' | 'accountant' | 'admin'>(
    user?.role === 'dsa' ? 'dsa' : user?.role === 'ops_team' ? 'accountant' : 'admin'
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2"><Wallet size={32} /> RC Limit Module</h1>
      
      <div className="flex gap-2 mb-6">
        {['dsa', 'accountant', 'admin'].map(v => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`px-4 py-2 rounded-lg ${view === v ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)} View
          </button>
        ))}
      </div>

      {view === 'dsa' && <DSAView />}
      {view === 'accountant' && <AccountantView />}
      {view === 'admin' && <AdminView />}
    </div>
  );
}

function DSAView() {
  const { data: folios = [] } = useQuery({
    queryKey: ['rc-folios'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-limits/folios`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  return (
    <div className="stat-card">
      <h2 className="text-xl font-semibold mb-4">My Folio Accounts</h2>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3">Loan ID</th>
            <th className="text-left py-3">Opening Balance</th>
            <th className="text-left py-3">Current Balance</th>
            <th className="text-left py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {folios.map((folio: any) => (
            <tr key={folio.id} className="border-b">
              <td className="py-3">#{folio.loan_id}</td>
              <td className="py-3">₹{Number(folio.opening_balance).toLocaleString()}</td>
              <td className="py-3">₹{Number(folio.current_balance).toLocaleString()}</td>
              <td className="py-3"><span className={`px-2 py-1 rounded text-xs ${folio.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{folio.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountantView() {
  const [showImport, setShowImport] = useState(false);
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['rc-entries'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-limits/entries`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const importStatement = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-limits/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rc-entries'] });
      toast.success('Statement imported');
      setShowImport(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg">
          <Upload size={18} /> Import Bank Statement
        </button>
      </div>

      {showImport && (
        <div className="stat-card">
          <h3 className="font-semibold mb-3">Upload Bank Statement</h3>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => e.target.files?.[0] && importStatement.mutate(e.target.files[0])}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      )}

      <div className="stat-card">
        <h2 className="text-xl font-semibold mb-4">Ledger Entries</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Type</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">UTR</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: any) => (
              <tr key={entry.id} className="border-b">
                <td className="py-2">{new Date(entry.created_at).toLocaleDateString()}</td>
                <td className="py-2">{entry.entry_type}</td>
                <td className="py-2">₹{Number(entry.amount).toLocaleString()}</td>
                <td className="py-2">{entry.utr_number || '-'}</td>
                <td className="py-2"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">{entry.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminView() {
  const { data: folios = [] } = useQuery({
    queryKey: ['all-folios'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-limits/admin/folios`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  return (
    <div className="stat-card">
      <h2 className="text-xl font-semibold mb-4">All Folio Accounts</h2>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3">Folio ID</th>
            <th className="text-left py-3">DSA</th>
            <th className="text-left py-3">Loan ID</th>
            <th className="text-left py-3">Balance</th>
            <th className="text-left py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {folios.map((folio: any) => (
            <tr key={folio.id} className="border-b">
              <td className="py-3">#{folio.id}</td>
              <td className="py-3">{folio.dsa_name}</td>
              <td className="py-3">#{folio.loan_id}</td>
              <td className="py-3">₹{Number(folio.current_balance).toLocaleString()}</td>
              <td className="py-3"><span className={`px-2 py-1 rounded text-xs ${folio.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{folio.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
