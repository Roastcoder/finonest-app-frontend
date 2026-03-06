import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/mock-data';
import { UserCheck, Search, Plus, FileText, IndianRupee, Edit } from 'lucide-react';
import { BrokerFormModal } from '@/components/BrokerFormModal';

export default function BrokerManagement() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editBroker, setEditBroker] = useState<any>(null);

  const { data: brokers = [], isLoading, refetch } = useQuery({
    queryKey: ['brokers'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/brokers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch brokers');
      return res.json();
    },
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans-for-brokers'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch loans');
      return res.json();
    },
  });

  const handleAddBroker = () => {
    setEditBroker(null);
    setModalOpen(true);
  };

  const handleEditBroker = (broker: any) => {
    setEditBroker(broker);
    setModalOpen(true);
  };

  const filtered = (brokers as any[]).filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.area || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = (loans as any[])
    .filter(l => l.status !== 'disbursed')
    .reduce((s, l) => s + Number(l.loan_amount) * 0.015, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Broker Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage external sales partners</p>
        </div>
        <button onClick={handleAddBroker} className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
          <Plus size={16} /> Add Broker
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><UserCheck size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{brokers.length}</p><p className="text-xs text-muted-foreground">Active Brokers</p></div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><FileText size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{loans.length}</p><p className="text-xs text-muted-foreground">Total Cases</p></div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><IndianRupee size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{formatCurrency(totalPending)}</p><p className="text-xs text-muted-foreground">Pending Payouts</p></div>
        </div>
      </div>

      <div className="stat-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search brokers..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent" />
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading brokers…</div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No brokers found</p>
        ) : (
          filtered.map((b: any) => {
            const brokerLoans = (loans as any[]).filter(l => l.assigned_broker_id === b.id);
            return (
              <div key={b.id} className="stat-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                      {b.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.email || b.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => handleEditBroker(b)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center border-t border-border pt-3">
                  <div><p className="text-lg font-bold text-foreground">{brokerLoans.length}</p><p className="text-[10px] text-muted-foreground">Cases</p></div>
                  <div><p className="text-lg font-bold text-accent">{b.commission_rate}%</p><p className="text-[10px] text-muted-foreground">Rate</p></div>
                  <div><p className="text-sm font-medium text-muted-foreground">{b.area || '—'}</p><p className="text-[10px] text-muted-foreground">Area</p></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="stat-card hidden lg:block">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading brokers…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Broker</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Area</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Cases</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Commission %</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="py-3 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b: any) => {
                  const brokerLoans = (loans as any[]).filter(l => l.assigned_broker_id === b.id);
                  return (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs">
                            {b.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{b.area || '—'}</td>
                      <td className="py-3 px-3 text-muted-foreground mono text-xs">{b.phone || '—'}</td>
                      <td className="py-3 px-3 font-medium text-foreground">{brokerLoans.length}</td>
                      <td className="py-3 px-3 font-medium text-accent">{b.commission_rate}%</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button onClick={() => handleEditBroker(b)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No brokers found</p>}
          </div>
        )}
      </div>

      <BrokerFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} broker={editBroker} />
    </div>
  );
}
