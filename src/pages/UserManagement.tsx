import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ROLE_LABELS, UserRole } from '@/lib/auth';
import { Users, Search, Shield, Edit } from 'lucide-react';
import { RoleAssignModal } from '@/components/RoleAssignModal';

export default function UserManagement() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const handleAssignRole = (u: any) => {
    setSelectedUser(u);
    setModalOpen(true);
  };

  const { data: profiles = [], isLoading, refetch, error } = useQuery({
    queryKey: ['users-management', user?.branch_id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: !!user,
  });

  const filtered = profiles.filter((u: any) => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = profiles.reduce((acc: Record<string, number>, u: any) => {
    if (u.role) acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users and their roles</p>
        </div>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div
            key={role}
            onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
            className={`stat-card cursor-pointer text-center ${roleFilter === role ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="text-lg font-bold text-foreground">{roleCounts[role] || 0}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="stat-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading users…</div>
        ) : error ? (
          <div className="py-8 text-center text-destructive text-sm">Error loading users.</div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>
        ) : (
          filtered.map((u: any) => (
            <div key={u.id} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                    {(u.full_name || u.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{u.full_name || '(No name)'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <button onClick={() => handleAssignRole(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    <Edit size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {u.role ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">
                    <Shield size={10} /> {ROLE_LABELS[u.role as UserRole]}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted">No role</span>
                )}
                {u.branch_name && (
                  <span className="text-xs text-muted-foreground">{u.branch_name}</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(u.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="stat-card hidden lg:block">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading users…</div>
        ) : error ? (
          <div className="py-8 text-center text-destructive text-sm">Error loading users. Check console for details.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Branch</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Joined</th>
                  {user?.role === 'admin' && <th className="py-3 px-3"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs">
                          {(u.full_name || u.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{u.full_name || '(No name)'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-3">
                      {u.role ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">
                          <Shield size={10} /> {ROLE_LABELS[u.role as UserRole]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No role</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">
                      {u.branch_name || <span className="text-muted-foreground/50">No branch</span>}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="py-3 px-3">
                        <button onClick={() => handleAssignRole(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Edit size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>}
          </div>
        )}
      </div>

      <RoleAssignModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} user={selectedUser} />
    </div>
  );
}
