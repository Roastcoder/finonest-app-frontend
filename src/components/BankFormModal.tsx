import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

interface BankFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bank?: any;
}

export function BankFormModal({ open, onClose, onSuccess, bank }: BankFormModalProps) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    status: 'active'
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bank ? 'Edit Bank' : 'Add Bank / NBFC'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Bank Name *</label>
              <input required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Code</label>
              <input className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Contact Person</label>
              <input className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Contact Email</label>
              <input type="email" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Contact Phone</label>
              <input className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
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
