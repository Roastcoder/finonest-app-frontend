import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, MapPin, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BranchManagement() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    manager_name: '',
    is_active: true,
  });

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch branches');
      return res.json();
    },
  });

  const saveBranch = useMutation({
    mutationFn: async (data: any) => {
      const method = editingBranch ? 'PUT' : 'POST';
      const url = editingBranch 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches/${editingBranch.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches`;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save branch');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success(editingBranch ? 'Branch updated' : 'Branch created');
      setShowModal(false);
      resetForm();
    },
    onError: () => toast.error('Failed to save branch'),
  });

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/branches/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to delete branch');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch deleted');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      manager_name: '',
      is_active: true,
    });
    setEditingBranch(null);
  };

  const handleEdit = (branch: any) => {
    setEditingBranch(branch);
    setFormData(branch);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveBranch.mutate(formData);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branch Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{branches.length} branches</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <Plus size={16} /> Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch: any) => (
          <div key={branch.id} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-accent" />
                <h3 className="font-semibold text-foreground">{branch.name}</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${branch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {branch.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Code: <span className="text-foreground font-medium">{branch.code}</span></p>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">{branch.address}, {branch.city}, {branch.state} - {branch.pincode}</p>
              </div>
              {branch.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground" />
                  <p className="text-muted-foreground">{branch.phone}</p>
                </div>
              )}
              {branch.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-muted-foreground" />
                  <p className="text-muted-foreground">{branch.email}</p>
                </div>
              )}
              {branch.manager_name && (
                <p className="text-muted-foreground">Manager: <span className="text-foreground">{branch.manager_name}</span></p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleEdit(branch)}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm transition-colors"
              >
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={() => deleteBranch.mutate(branch.id)}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">{editingBranch ? 'Edit Branch' : 'Add Branch'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Manager Name</label>
                <input
                  type="text"
                  value={formData.manager_name}
                  onChange={e => setFormData({ ...formData, manager_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-foreground">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saveBranch.isPending}
                  className="flex-1 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {saveBranch.isPending ? 'Saving...' : 'Save Branch'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
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
