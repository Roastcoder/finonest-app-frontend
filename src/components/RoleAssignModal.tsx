import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface RoleAssignModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export function RoleAssignModal({ open, onClose, onSuccess, user: targetUser }: RoleAssignModalProps) {
  const { user } = useAuth();
  const [role, setRole] = useState(targetUser?.role || 'executive');
  const [branchId, setBranchId] = useState(targetUser?.branch_id || '');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(targetUser?.full_name || '');
  const [email, setEmail] = useState(targetUser?.email || '');
  const [phone, setPhone] = useState(targetUser?.phone || '');
  const [password, setPassword] = useState('');

  // Manager can only assign team_leader and executive roles
  const allowedRoles = user?.role === 'manager' 
    ? { team_leader: ROLE_LABELS.team_leader, executive: ROLE_LABELS.executive }
    : ROLE_LABELS;

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
    if (targetUser) {
      setRole(targetUser.role || 'executive');
      setBranchId(targetUser.branch_id || '');
      setFullName(targetUser.full_name || '');
      setEmail(targetUser.email || '');
      setPhone(targetUser.phone || '');
    } else {
      setRole('executive');
      setBranchId('');
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
    }
  }, [targetUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (targetUser) {
        // Update existing user
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${targetUser.id}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({ role, branch_id: branchId || null }),
        });
        if (!res.ok) throw new Error('Failed to update user');
        toast.success('User updated successfully!');
      } else {
        // Create new user
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({ 
            full_name: fullName, 
            email, 
            phone, 
            password, 
            role, 
            branch_id: branchId || null 
          }),
        });
        if (!res.ok) throw new Error('Failed to create user');
        toast.success('User created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(targetUser ? 'Failed to update user' : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{targetUser ? `Edit ${targetUser?.full_name || targetUser?.email}` : 'Add New User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!targetUser && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password *</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Role *</label>
            <select required className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={role} onChange={e => setRole(e.target.value)}>
              {Object.entries(allowedRoles).map(([key, label]) => (
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
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : (targetUser ? 'Save Changes' : 'Create User')}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
