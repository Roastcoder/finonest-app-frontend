import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

interface BankFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bank?: any;
}

export function BankFormModal({ open, onClose, onSuccess, bank }: BankFormModalProps) {
  const [form, setForm] = useState({
    name: '',
    location: '',
    geo_limit: '',
    sales_manager_name: '',
    sales_manager_mobile: '',
    area_sales_manager_name: '',
    area_sales_manager_mobile: '',
    product: '',
    status: 'active'
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bank) {
      setForm({
        name: bank.name || '',
        location: bank.location || '',
        geo_limit: bank.geo_limit || '',
        sales_manager_name: bank.sales_manager_name || '',
        sales_manager_mobile: bank.sales_manager_mobile || '',
        area_sales_manager_name: bank.area_sales_manager_name || '',
        area_sales_manager_mobile: bank.area_sales_manager_mobile || '',
        product: bank.product || '',
        status: bank.status || 'active'
      });
      if (bank.logo_url) {
        setLogoPreview(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${bank.logo_url}`);
      }
    } else {
      setForm({
        name: '',
        location: '',
        geo_limit: '',
        sales_manager_name: '',
        sales_manager_mobile: '',
        area_sales_manager_name: '',
        area_sales_manager_mobile: '',
        product: '',
        status: 'active'
      });
      setLogoPreview('');
    }
    setLogoFile(null);
  }, [bank, open]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo file size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const method = bank ? 'PUT' : 'POST';
      const url = bank 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks/${bank.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`;
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to save bank');
      toast.success(bank ? 'Bank updated successfully!' : 'Bank added successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to save bank');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bank ? 'Edit Bank / NBFC' : 'Add Bank / NBFC'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Bank / NBFC Name *</label>
              <input required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Location *</label>
              <input required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Geo Limit (KM) *</label>
              <input required type="number" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.geo_limit} onChange={e => setForm({...form, geo_limit: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Product Name *</label>
              <input required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sales Manager Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Sales Manager Name *</label>
                <input required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.sales_manager_name} onChange={e => setForm({...form, sales_manager_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sales Manager Mobile *</label>
                <input required type="tel" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.sales_manager_mobile} onChange={e => setForm({...form, sales_manager_mobile: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Area Manager Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Area Manager Name *</label>
                <input required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.area_sales_manager_name} onChange={e => setForm({...form, area_sales_manager_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Area Manager Mobile *</label>
                <input required type="tel" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.area_sales_manager_mobile} onChange={e => setForm({...form, area_sales_manager_mobile: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Bank Logo</label>
              <div className="space-y-3">
                {logoPreview && (
                  <div className="relative inline-block">
                    <img src={logoPreview} alt="Logo preview" className="w-20 h-20 object-contain border border-border rounded-lg" />
                    <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="file" id="logo" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  <label htmlFor="logo" className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors text-sm">
                    <Upload size={16} /> Choose Logo
                  </label>
                  <span className="text-xs text-muted-foreground">Max 5MB, PNG/JPG</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity">{loading ? 'Saving...' : 'Save Bank'}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
