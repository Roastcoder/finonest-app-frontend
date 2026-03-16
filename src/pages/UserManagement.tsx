import { useState, useMemo } from 'react';
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

  const { data: rawUsers = [], isLoading, refetch, error } = useQuery({
    queryKey: ['users-hierarchy', user?.branch_id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/hierarchy`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch hierarchy');
      return res.json();
    },
    enabled: !!user,
  });

  const isAdmin = user?.role === 'admin';
  const validRoles = isAdmin
    ? ['admin', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive']
    : ['branch_manager', 'dsa', 'team_leader', 'executive'];
  
  const allFiltered = useMemo(() => {
    return rawUsers.filter((u: any) => {
      const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || 
        (roleFilter === 'branch_manager_dsa' && ['branch_manager', 'dsa'].includes(u.role)) ||
        u.role === roleFilter;
      return matchSearch && matchRole && validRoles.includes(u.role);
    });
  }, [rawUsers, search, roleFilter]);

  const usersByRole = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    allFiltered.forEach((u: any) => {
      if (!grouped[u.role]) grouped[u.role] = [];
      grouped[u.role].push(u);
    });
    return grouped;
  }, [allFiltered]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ['admin', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'].forEach(role => {
      counts[role] = rawUsers.filter((u: any) => u.role === role).length;
    });
    return counts;
  }, [rawUsers]);

  const getManagerName = (managerId: number) => {
    const manager = rawUsers.find((u: any) => u.id === managerId);
    return manager ? manager.full_name || manager.email : '—';
  };

  const UserTable = ({ users }: any) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">User ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Reporting To</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Branch</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-foreground">{u.full_name || '(No name)'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground truncate">{u.email}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{u.user_id}</td>
              <td className="px-4 py-3 text-sm text-blue-600 font-medium">{u.reporting_to ? getManagerName(u.reporting_to) : '—'}</td>
              <td className="px-4 py-3 text-sm text-green-600">{u.branch_name || '—'}</td>
              <td className="px-4 py-3 text-center">
                <button onClick={() => handleAssignRole(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Edit size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users, roles, and reporting hierarchy</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'sales_manager' || user?.role === 'branch_manager' || user?.role === 'dsa' || user?.role === 'team_leader') && (
          <button
            onClick={() => {
              setSelectedUser(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <Users size={16} /> Add New User
          </button>
        )}
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {isAdmin && (
          <div
            onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')}
            className={`stat-card cursor-pointer text-center ${roleFilter === 'admin' ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="text-lg font-bold text-foreground">{roleCounts['admin'] || 0}</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        )}

        {isAdmin && (
          <div
            onClick={() => setRoleFilter(roleFilter === 'sales_manager' ? 'all' : 'sales_manager')}
            className={`stat-card cursor-pointer text-center ${roleFilter === 'sales_manager' ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="text-lg font-bold text-foreground">{roleCounts['sales_manager'] || 0}</p>
            <p className="text-xs text-muted-foreground">Sales Manager</p>
          </div>
        )}

        <div
          onClick={() => setRoleFilter(roleFilter === 'branch_manager_dsa' ? 'all' : 'branch_manager_dsa')}
          className={`stat-card cursor-pointer text-center ${roleFilter === 'branch_manager_dsa' ? 'ring-2 ring-accent' : ''}`}
        >
          <p className="text-lg font-bold text-foreground">{(roleCounts['branch_manager'] || 0) + (roleCounts['dsa'] || 0)}</p>
          <p className="text-xs text-muted-foreground">BM / DSA</p>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'team_leader' ? 'all' : 'team_leader')}
          className={`stat-card cursor-pointer text-center ${roleFilter === 'team_leader' ? 'ring-2 ring-accent' : ''}`}
        >
          <p className="text-lg font-bold text-foreground">{roleCounts['team_leader'] || 0}</p>
          <p className="text-xs text-muted-foreground">Team Leader</p>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'executive' ? 'all' : 'executive')}
          className={`stat-card cursor-pointer text-center ${roleFilter === 'executive' ? 'ring-2 ring-accent' : ''}`}
        >
          <p className="text-lg font-bold text-foreground">{roleCounts['executive'] || 0}</p>
          <p className="text-xs text-muted-foreground">Executive</p>
        </div>
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

      {/* Users by Role */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading users…</div>
        ) : error ? (
          <div className="py-8 text-center text-destructive text-sm">Error loading users.</div>
        ) : allFiltered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>
        ) : (
          <>
            {/* Admin Section */}
            {isAdmin && (roleFilter === 'all' || roleFilter === 'admin') && (usersByRole['admin']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Admin ({usersByRole['admin']?.length || 0})
                </h3>
                <UserTable users={usersByRole['admin']} />
              </div>
            )}

            {/* Sales Manager Section */}
            {isAdmin && (roleFilter === 'all' || roleFilter === 'sales_manager') && (usersByRole['sales_manager']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Sales Manager ({usersByRole['sales_manager']?.length || 0})
                </h3>
                <UserTable users={usersByRole['sales_manager']} />
              </div>
            )}

            {/* Branch Manager & DSA Section (Combined) */}
            {(roleFilter === 'all' || roleFilter === 'branch_manager_dsa') && ((usersByRole['branch_manager']?.length > 0) || (usersByRole['dsa']?.length > 0)) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Branch Manager & DSA ({(usersByRole['branch_manager']?.length || 0) + (usersByRole['dsa']?.length || 0)})
                </h3>
                <UserTable users={[...(usersByRole['branch_manager'] || []), ...(usersByRole['dsa'] || [])]} />
              </div>
            )}

            {/* Team Leader Section */}
            {(roleFilter === 'all' || roleFilter === 'team_leader') && (usersByRole['team_leader']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Team Leader ({usersByRole['team_leader']?.length || 0})
                </h3>
                <UserTable users={usersByRole['team_leader']} />
              </div>
            )}

            {/* Executive Section */}
            {(roleFilter === 'all' || roleFilter === 'executive') && (usersByRole['executive']?.length > 0) && (
              <div className="stat-card">
                <h3 className="text-md font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Shield size={18} className="text-accent" /> Executive ({usersByRole['executive']?.length || 0})
                </h3>
                <UserTable users={usersByRole['executive']} />
              </div>
            )}
          </>
        )}
      </div>

      <RoleAssignModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} user={selectedUser} />
    </div>
  );
}





