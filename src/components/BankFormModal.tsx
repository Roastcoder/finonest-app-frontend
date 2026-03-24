import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, X, Plus, Trash2 } from 'lucide-react';

interface Branch {
  id?: number;
  branch_name: string;
  location: string;
  geo_limit: string;
  product: string;
  sales_manager_name: string;
  sales_manager_mobile: string;
  area_sales_manager_name: string;
  area_sales_manager_mobile: string;
  status: string;
}

interface BankFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bank?: any;
}

const emptyBranch = (): Branch => ({
  branch_name: '', location: '', geo_limit: '', product: '',
  sales_manager_name: '', sales_manager_mobile: '',
  area_sales_manager_name: '', area_sales_manager_mobile: '',
  status: 'active',
});

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE = API.replace('/api', '');
const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` });

export function BankFormModal({ open, onClose, onSuccess, bank }: BankFormModalProps) {
  const [form, setForm] = useState({ name: '', status: 'active' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isNewBranch, setIsNewBranch] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-accent';
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

  useEffect(() => {
    if (!open) return;
    if (bank) {
      setForm({ name: bank.name || '', status: bank.status || 'active' });
      if (bank.logo_url) setLogoPreview(`${API_BASE}${bank.logo_url}`);
      fetch(`${API}/banks/${bank.id}/branches`, { headers: authHeader() })
        .then(r => r.json())
        .then(data => setBranches(Array.isArray(data) ? data : []))
        .catch(() => setBranches([]));
    } else {
      setForm({ name: '', status: 'active' });
      setLogoPreview('');
      setBranches([]);
    }
    setLogoFile(null);
    setSelectedBranchId('');
    setActiveBranch(null);
    setIsNewBranch(false);
  }, [bank, open]);

  const handleBranchSelect = (id: string) => {
    setSelectedBranchId(id);
    setIsNewBranch(false);
    if (!id) { setActiveBranch(null); return; }
    const found = branches.find(b => String(b.id) === id);
    setActiveBranch(found ? { ...found } : null);
  };

  const handleAddNewBranch = () => {
    setSelectedBranchId('');
    setIsNewBranch(true);
    setActiveBranch(emptyBranch());
  };

  const updateActiveBranch = (key: keyof Branch, val: string) => {
    setActiveBranch(prev => prev ? { ...prev, [key]: val } : null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo must be less than 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveBranch = async (bankId: number) => {
    if (!activeBranch) return;
    if (!activeBranch.branch_name.trim()) { toast.error('Branch name is required'); return; }
    setBranchLoading(true);
    try {
      const { id, ...branchData } = activeBranch as any;
      if (!isNewBranch && id) {
        const res = await fetch(`${API}/banks/${bankId}/branches/${id}`, {
          method: 'PUT',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify(branchData),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setBranches(prev => prev.map(b => b.id === id ? { ...updated } : b));
        setActiveBranch({ ...updated });
        toast.success('Branch updated!');
      } else {
        const res = await fetch(`${API}/banks/${bankId}/branches`, {
          method: 'POST',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify(branchData),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setBranches(prev => [...prev, created]);
        setSelectedBranchId(String(created.id));
        setActiveBranch({ ...created });
        setIsNewBranch(false);
        toast.success('Branch added!');
      }
    } catch {
      toast.error('Failed to save branch');
    } finally {
      setBranchLoading(false);
    }
  };

  const deleteBranch = async (bankId: number) => {
    if (!activeBranch?.id) return;
    if (!confirm('Delete this branch?')) return;
    try {
      await fetch(`${API}/banks/${bankId}/branches/${activeBranch.id}`, { method: 'DELETE', headers: authHeader() });
      setBranches(prev => prev.filter(b => b.id !== activeBranch.id));
      setActiveBranch(null);
      setSelectedBranchId('');
      setIsNewBranch(false);
      toast.success('Branch deleted');
    } catch {
      toast.error('Failed to delete branch');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Bank name is required'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('status', form.status);
      if (logoFile) formData.append('logo', logoFile);

      const method = bank ? 'PUT' : 'POST';
      const url = bank ? `${API}/banks/${bank.id}` : `${API}/banks`;
      const res = await fetch(url, { method, headers: authHeader(), body: formData });
      if (!res.ok) throw new Error();
      toast.success(bank ? 'Bank updated!' : 'Bank added!');
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to save bank');
    } finally {
      setLoading(false);
    }
  };

  const bankId = bank?.id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bank ? 'Edit Bank / NBFC' : 'Add Bank / NBFC'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bank Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>Bank / NBFC Name *</label>
              <input required className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. HDFC Bank" />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className={labelClass}>Bank Logo</label>
            <div className="flex items-center gap-3">
              {logoPreview && (
                <div className="relative">
                  <img src={logoPreview} alt="Logo" className="w-14 h-14 object-contain border border-border rounded-lg" />
                  <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(''); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                    <X size={10} />
                  </button>
                </div>
              )}
              <div>
                <input type="file" id="logo" accept="image/*" onChange={handleLogoChange} className="hidden" />
                <label htmlFor="logo" className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors text-sm">
                  <Upload size={14} /> Choose Logo
                </label>
                <p className="text-xs text-muted-foreground mt-1">Max 5MB, PNG/JPG</p>
              </div>
            </div>
          </div>

          {/* Branches section — only when editing existing bank */}
          {bank && (
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Branches</h3>
                <button
                  type="button"
                  onClick={handleAddNewBranch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
                >
                  <Plus size={13} /> Add New Branch
                </button>
              </div>

              {/* Branch dropdown */}
              {branches.length > 0 && !isNewBranch && (
                <div>
                  <label className={labelClass}>Select Branch to Edit</label>
                  <select
                    className={inputClass}
                    value={selectedBranchId}
                    onChange={e => handleBranchSelect(e.target.value)}
                  >
                    <option value="">— Select a branch —</option>
                    {branches.map(b => (
                      <option key={b.id} value={String(b.id)}>{b.branch_name}{b.location ? ` (${b.location})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Branch form */}
              {activeBranch && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <p className="text-xs font-bold text-accent uppercase tracking-wide">
                    {isNewBranch ? 'New Branch' : `Editing: ${activeBranch.branch_name}`}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelClass}>Branch Name *</label>
                      <input required className={inputClass} value={activeBranch.branch_name} onChange={e => updateActiveBranch('branch_name', e.target.value)} placeholder="e.g. Andheri Branch" />
                    </div>
                    <div>
                      <label className={labelClass}>Location</label>
                      <input className={inputClass} value={activeBranch.location} onChange={e => updateActiveBranch('location', e.target.value)} placeholder="City / Area" />
                    </div>
                    <div>
                      <label className={labelClass}>Geo Limit (KM)</label>
                      <input type="number" className={inputClass} value={activeBranch.geo_limit} onChange={e => updateActiveBranch('geo_limit', e.target.value)} placeholder="e.g. 50" />
                    </div>
                    <div>
                      <label className={labelClass}>Product</label>
                      <input className={inputClass} value={activeBranch.product} onChange={e => updateActiveBranch('product', e.target.value)} placeholder="e.g. Used Car Loan" />
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select className={inputClass} value={activeBranch.status} onChange={e => updateActiveBranch('status', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">Sales Manager</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Name</label>
                        <input className={inputClass} value={activeBranch.sales_manager_name} onChange={e => updateActiveBranch('sales_manager_name', e.target.value)} placeholder="Full name" />
                      </div>
                      <div>
                        <label className={labelClass}>Mobile</label>
                        <input type="tel" maxLength={10} className={inputClass} value={activeBranch.sales_manager_mobile} onChange={e => updateActiveBranch('sales_manager_mobile', e.target.value)} placeholder="10-digit number" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">Area Manager</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Name</label>
                        <input className={inputClass} value={activeBranch.area_sales_manager_name} onChange={e => updateActiveBranch('area_sales_manager_name', e.target.value)} placeholder="Full name" />
                      </div>
                      <div>
                        <label className={labelClass}>Mobile</label>
                        <input type="tel" maxLength={10} className={inputClass} value={activeBranch.area_sales_manager_mobile} onChange={e => updateActiveBranch('area_sales_manager_mobile', e.target.value)} placeholder="10-digit number" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {!isNewBranch && activeBranch.id && (
                      <button
                        type="button"
                        onClick={() => deleteBranch(bankId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} /> Delete Branch
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => saveBranch(bankId)}
                      disabled={branchLoading}
                      className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {branchLoading ? 'Saving…' : isNewBranch ? 'Save Branch' : 'Update Branch'}
                    </button>
                  </div>
                </div>
              )}

              {branches.length === 0 && !isNewBranch && (
                <p className="text-xs text-muted-foreground text-center py-2">No branches yet. Click "Add New Branch" to add one.</p>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity">
              {loading ? 'Saving...' : bank ? 'Update Bank' : 'Add Bank'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
