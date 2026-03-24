import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ROLE_LABELS, UserRole } from '@/lib/auth';
import { Users, Search, Shield, Edit, Trash2, Check, X } from 'lucide-react';
import { RoleAssignModal } from '@/components/RoleAssignModal';
import { toast } from 'sonner';

export default function UserManagement() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete user');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    }
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${userId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to approve user');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('User approved successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve user');
    }
  });

  const rejectUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${userId}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reject user');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('User rejected successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject user');
    }
  });

  const handleApproveUser = (u: any) => {
    if (confirm(`Are you sure you want to approve ${u.full_name}?`)) {
      approveUserMutation.mutate(u.id);
    }
  };

  const handleRejectUser = (u: any) => {
    if (confirm(`Are you sure you want to reject ${u.full_name}?`)) {
      rejectUserMutation.mutate(u.id);
    }
  };

  const bulkApproveUsers = useMutation({
    mutationFn: async (userIds: number[]) => {
      const promises = userIds.map(id => 
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${id}/approve`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        })
      );
      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(res => res.json()));
      return results;
    },
    onSuccess: (data) => {
      toast.success(`Approved ${selectedUsers.length} users successfully`);
      setSelectedUsers([]);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve users');
    }
  });

  const handleBulkApprove = () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to approve');
      return;
    }
    if (confirm(`Are you sure you want to approve ${selectedUsers.length} selected users?`)) {
      bulkApproveUsers.mutate(selectedUsers);
    }
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = (users: any[]) => {
    const pendingUsers = users.filter(u => u.status !== 'active').map(u => u.id);
    if (selectedUsers.length === pendingUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(pendingUsers);
    }
  };

  const generateReferCodes = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/generate-refer-codes`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate refer codes');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Generated refer codes for ${data.updatedCount} users`);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate refer codes');
    }
  });

  const handleGenerateReferCodes = () => {
    if (confirm('Generate refer codes for Team Leaders, Branch Managers, and DSAs who don\'t have one?')) {
      generateReferCodes.mutate();
    }
  };

  const handleDeleteUser = (u: any) => {
    if (confirm(`Are you sure you want to delete ${u.full_name}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(u.id);
    }
  };

  const isAdmin = user?.role === 'admin';
  const validRoles = isAdmin
    ? ['admin', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive']
    : ['branch_manager', 'dsa', 'team_leader', 'executive'];
  
  const allFiltered = useMemo(() => {
    return rawUsers.filter((u: any) => {
      const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.toLowerCase().includes(search.toLowerCase());
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
    return manager ? manager.full_name || manager.phone : '—';
  };

  const UserTable = ({ users }: any) => {
    console.log('Users with status:', users.map((u: any) => ({ name: u.full_name, status: u.status })));
    const pendingUsers = users.filter((u: any) => u.status !== 'active');
    const allPendingSelected = pendingUsers.length > 0 && pendingUsers.every((u: any) => selectedUsers.includes(u.id));
    
    return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-center text-xs font-semibold text-foreground">
              {pendingUsers.length > 0 && (
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={() => handleSelectAll(users)}
                  className="rounded border-border"
                />
              )}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">User ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Reporting To</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Branch</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Refer Code</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-center">
                {u.status !== 'active' && (
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => handleSelectUser(u.id)}
                    className="rounded border-border"
                  />
                )}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-foreground">{u.full_name || '(No name)'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground truncate">{u.phone || '—'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{u.user_id}</td>
              <td className="px-4 py-3 text-sm text-blue-600 font-medium">{u.reporting_to ? getManagerName(u.reporting_to) : '—'}</td>
              <td className="px-4 py-3 text-sm text-green-600">{u.branch_name || '—'}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  u.status === 'active' ? 'bg-green-100 text-green-800' :
                  u.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {u.status === 'active' ? 'Approved' : u.status === 'rejected' ? 'Rejected' : 'Pending'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {['team_leader', 'branch_manager', 'dsa'].includes(u.role) ? (
                  u.refer_code ? (
                    <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      {u.refer_code}
                    </code>
                  ) : (
                    <span className="text-gray-400 text-xs">Not Generated</span>
                  )
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  {u.status !== 'active' && (
                    <button 
                      onClick={() => handleApproveUser(u)} 
                      disabled={approveUserMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-green-100 transition-colors text-green-600 hover:text-green-700 disabled:opacity-50"
                      title="Approve User"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {u.status !== 'rejected' && (
                    <button 
                      onClick={() => handleRejectUser(u)} 
                      disabled={rejectUserMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Reject User"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <button onClick={() => handleAssignRole(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Edit size={14} />
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteUser(u)} 
                      disabled={deleteUserMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users, roles, and reporting hierarchy</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'sales_manager' || user?.role === 'branch_manager' || user?.role === 'dsa' || user?.role === 'team_leader') && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedUser(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              <Users size={16} /> Add New User
            </button>
            {selectedUsers.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproveUsers.isPending}
                className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                <Check size={16} /> Approve Selected ({selectedUsers.length})
              </button>
            )}
            {/* Debug info */}
            <div className="text-xs text-gray-500 flex items-center">
              Selected: {selectedUsers.length}
            </div>
          </div>
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
            placeholder="Search users by name or phone..."
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
