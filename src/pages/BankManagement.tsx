import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/mock-data';
import { Building2, Search, Plus, TrendingUp, FileText, Edit, ChevronDown, ChevronUp, MapPin, Phone, User, X, Pencil } from 'lucide-react';
import { BankFormModal } from '@/components/BankFormModal';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` });

// Branch Dialog Component
function BranchDialog({ branch, onClose, onSuccess }: { branch: any; onClose: () => void; onSuccess: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(branch);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    branch.product ? branch.product.split(', ').map((p: string) => p.trim()) : []
  );

  const productOptions = [
    'New Car - Purchase',
    'Used Car - Purchase',
    'Used Car - Refinance',
    'Used Car - Top-up',
    'Used Car - BT'
  ];

  const handleProductToggle = (product: string) => {
    setSelectedProducts(prev => 
      prev.includes(product)
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  };

  useEffect(() => {
    setFormData(branch);
    setIsEditing(false);
  }, [branch]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { bank_id, ...branchData } = formData;
      const updatedData = {
        ...branchData,
        product: selectedProducts.length > 0 ? selectedProducts.join(', ') : ''
      };
      const res = await fetch(`${API}/banks/${branch.bank_id}/branches/${branch.id}`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error('Failed to update branch');
      toast.success('Branch updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-[10001]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
          <h2 className="text-xl font-bold text-foreground">{branch.branch_name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Edit Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Branch Name</label>
              <input
                type="text"
                value={formData.branch_name}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Geo Limit</label>
              <input
                type="text"
                value={formData.geo_limit || ''}
                onChange={(e) => setFormData({ ...formData, geo_limit: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Products</label>
              <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
                {productOptions.map(product => (
                  <label key={product} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product)}
                      onChange={() => handleProductToggle(product)}
                      className="w-4 h-4 rounded border-border cursor-pointer"
                    />
                    <span className="text-sm text-foreground">{product}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Sales Manager Name</label>
              <input
                type="text"
                value={formData.sales_manager_name || ''}
                onChange={(e) => setFormData({ ...formData, sales_manager_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Sales Manager Mobile</label>
              <input
                type="text"
                value={formData.sales_manager_mobile || ''}
                onChange={(e) => setFormData({ ...formData, sales_manager_mobile: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Area Manager Name</label>
              <input
                type="text"
                value={formData.area_sales_manager_name || ''}
                onChange={(e) => setFormData({ ...formData, area_sales_manager_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Area Manager Mobile</label>
              <input
                type="text"
                value={formData.area_sales_manager_mobile || ''}
                onChange={(e) => setFormData({ ...formData, area_sales_manager_mobile: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border sticky bottom-0 bg-background">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium">
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-60 text-sm font-medium"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Branches List Dialog Component
function BranchesListDialog({ bankId, onClose }: { bankId: number; onClose: () => void }) {
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const { data: branches = [], isLoading, refetch } = useQuery({
    queryKey: ['bank-branches', bankId],
    queryFn: async () => {
      const res = await fetch(`${API}/banks/${bankId}/branches`, { headers: authHeader() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl p-6">
        <p className="text-muted-foreground">Loading branches...</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
          <h2 className="text-xl font-bold text-foreground">Bank Branches</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {branches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No branches added yet.</p>
          ) : (
            <div className="space-y-3">
              {branches.map((b: any) => (
                <div
                  key={b.id}
                  className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-foreground">{b.branch_name}</span>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                          b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        {b.location && <span className="flex items-center gap-1"><MapPin size={10} />{b.location}</span>}
                        {b.geo_limit && <span>Geo: {b.geo_limit} km</span>}
                        {b.product && <span className="col-span-2">Product: {b.product}</span>}
                        {b.sales_manager_name && (
                          <span className="flex items-center gap-1 col-span-2">
                            <User size={10} /> SM: {b.sales_manager_name}
                            {b.sales_manager_mobile && <span className="flex items-center gap-1 ml-2"><Phone size={10} />{b.sales_manager_mobile}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBranch({ ...b, bank_id: bankId })}
                      className="ml-3 p-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-colors flex-shrink-0"
                      title="Edit branch"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border sticky bottom-0 bg-background">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium">
            Close
          </button>
        </div>
      </div>

      {selectedBranch && (
        <BranchDialog
          branch={selectedBranch}
          onClose={() => setSelectedBranch(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}



export default function BankManagement() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editBank, setEditBank] = useState<any>(null);
  const [branchesDialogOpen, setBranchesDialogOpen] = useState<number | null>(null);

  const { data: banks = [], isLoading, refetch } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch banks');
      return res.json();
    },
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans-for-banks'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch loans');
      return res.json();
    },
  });

  const handleAddBank = () => {
    setEditBank(null);
    setModalOpen(true);
  };

  const handleEditBank = (bank: any) => {
    setEditBank(bank);
    setModalOpen(true);
  };

  const filtered = (banks as any[]).filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  const totalVolume = (loans as any[]).reduce((s, l) => s + Number(l.loan_amount), 0);
  const totalCases = loans.length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank / NBFC Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage lending partners and track performance</p>
        </div>
        <button onClick={handleAddBank} className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
          <Plus size={16} /> Add Bank / NBFC
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Building2 size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{banks.length}</p><p className="text-xs text-muted-foreground">Active Banks</p></div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><FileText size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{totalCases}</p><p className="text-xs text-muted-foreground">Total Cases</p></div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><TrendingUp size={20} className="text-accent" /></div>
          <div><p className="text-2xl font-bold text-foreground">{formatCurrency(totalVolume)}</p><p className="text-xs text-muted-foreground">Total Volume</p></div>
        </div>
      </div>

      <div className="stat-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search banks..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading banks…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((bank: any) => {
            const bankLoans = (loans as any[]).filter(l => l.assigned_bank_id === bank.id);
            const disbursed = bankLoans.filter(l => l.status === 'disbursed').length;
            const branchCount = bank.branches ? bank.branches.length : 0;
            return (
              <div key={bank.id} className="stat-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {bank.logo_url && (
                      <img 
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${bank.logo_url}`} 
                        alt={bank.name} 
                        className="w-10 h-10 rounded-lg object-contain bg-muted" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{bank.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${bank.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                      {bank.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => handleEditBank(bank)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center mb-3">
                  <div><p className="text-lg font-bold text-foreground">{bankLoans.length}</p><p className="text-[10px] text-muted-foreground">Cases</p></div>
                  <div><p className="text-lg font-bold text-foreground">{disbursed}</p><p className="text-[10px] text-muted-foreground">Disbursed</p></div>
                  <div><p className="text-lg font-bold text-accent">—</p><p className="text-[10px] text-muted-foreground">Status</p></div>
                  <div><p className="text-lg font-bold text-foreground">{branchCount}</p><p className="text-[10px] text-muted-foreground">Branches</p></div>
                </div>
                {/* View Branches Button */}
                <button
                  type="button"
                  onClick={() => setBranchesDialogOpen(bank.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-semibold text-foreground"
                >
                  <span>View Branches</span>
                  <ChevronDown size={14} />
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground text-sm col-span-2 text-center py-8">No banks found</p>}
        </div>
      )}

      <BankFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} bank={editBank} />
      {branchesDialogOpen && (
        <BranchesListDialog
          bankId={branchesDialogOpen}
          onClose={() => setBranchesDialogOpen(null)}
        />
      )}
    </div>
  );
}
