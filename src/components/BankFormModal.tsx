import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';

interface BankFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bank?: any;
}

export function BankFormModal({ open, onClose, onSuccess, bank }: BankFormModalProps) {
  const [form, setForm] = useState({
    name: bank?.name || '',
    contact_person: bank?.contact_person || '',
    email: bank?.email || '',
    phone: bank?.phone || '',
    interest_rate: bank?.interest_rate || '',
    is_active: bank?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = bank ? 'PUT' : 'POST';
      const url = bank 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks/${bank.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banks`;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(form),
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{bank ? 'Edit Bank' : 'Add Bank / NBFC'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Bank Name *</label>
            <input required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Contact Person</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Interest Rate (%) *</label>
            <input required type="number" step="0.1" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.interest_rate} onChange={e => setForm({...form, interest_rate: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
            <label htmlFor="is_active" className="text-sm font-medium">Active</label>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
