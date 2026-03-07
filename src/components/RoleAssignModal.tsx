import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';

interface RoleAssignModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export function RoleAssignModal({ open, onClose, onSuccess, user }: RoleAssignModalProps) {
  const [role, setRole] = useState(user?.role || 'executive');
  const [branchId, setBranchId] = useState(user?.branch_id || '');
  const [loading, setLoading] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    },
  });

  useEffect(() => {
    if (user) {
      setRole(user.role || 'executive');
      setBranchId(user.branch_id || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${user.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ role, branch_id: branchId || null }),
      });
      if (!res.ok) throw new Error('Failed to update user');

      toast.success('User updated successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role & Branch to {user?.full_name || user?.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Role *</label>
            <select required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={role} onChange={e => setRole(e.target.value)}>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Branch</label>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">No Branch</option>
              {branches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
