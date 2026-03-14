import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UserManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setShowForm(false);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Users size={32} /> User Management</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg">
          <Plus size={18} /> Add User
        </button>
      </div>

      {showForm && <UserForm onClose={() => setShowForm(false)} onSubmit={(data) => createUser.mutate(data)} users={users} />}

      <div className="stat-card">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Name</th>
              <th className="text-left py-3">Email</th>
              <th className="text-left py-3">Role</th>
              <th className="text-left py-3">Branch</th>
              <th className="text-left py-3">Status</th>
              <th className="text-right py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id} className="border-b">
                <td className="py-3">{user.name}</td>
                <td className="py-3">{user.email}</td>
                <td className="py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{user.role}</span></td>
                <td className="py-3">{user.branch || '-'}</td>
                <td className="py-3"><span className={`px-2 py-1 rounded text-xs ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.status}</span></td>
                <td className="py-3 text-right">
                  <button onClick={() => deleteUser.mutate(user.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserForm({ onClose, onSubmit, users }: any) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'executive', phone: '', branch: '', reporting_to: '', joining_date: '' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Add User</h2>
        <div className="space-y-3">
          <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-3 py-2 border rounded">
            <option value="executive">Executive</option>
            <option value="team_leader">Team Leader</option>
            <option value="branch_manager">Branch Manager</option>
            <option value="dsa">DSA</option>
            <option value="manager">Manager</option>
            <option value="sales_manager">Sales Manager</option>
            <option value="ops_team">Ops Team</option>
            <option value="admin">Admin</option>
          </select>
          <input placeholder="Branch" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} className="w-full px-3 py-2 border rounded" />
          <select value={form.reporting_to} onChange={e => setForm({...form, reporting_to: e.target.value})} className="w-full px-3 py-2 border rounded">
            <option value="">Select Reporting Manager</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
          <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})} className="w-full px-3 py-2 border rounded" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSubmit(form)} className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded">Create</button>
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
}
