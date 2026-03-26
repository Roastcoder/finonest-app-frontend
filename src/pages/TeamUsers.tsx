import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, Shield, ChevronDown, ChevronRight, UserPlus, X, Edit2, Save, Phone, User } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@/lib/auth';
import { toast } from 'sonner';

const UserHierarchyNode = ({ user, childrenMap, level = 0, onUpdateReporting, availableManagers }: any) => {
  const [expanded, setExpanded] = useState(true); // Keep expanded by default like desktop
  const [isEditing, setIsEditing] = useState(false);
  const [newReportingTo, setNewReportingTo] = useState(user.reporting_to || '');
  const children = childrenMap[user.id] || [];

  const handleSaveReporting = () => {
    if (newReportingTo !== user.reporting_to) {
      onUpdateReporting(user.id, newReportingTo);
    }
    setIsEditing(false);
  };

  return (
    <div className="w-full">
      {/* Unified View - Same for Desktop and Mobile */}
      <div className="block">
        <div
          className={`flex items-center justify-between p-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${level > 0 ? 'border-l-2 border-l-accent' : ''}`}
          style={{ paddingLeft: `${Math.max(0.75, level * 2)}rem` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {children.length > 0 ? (
              <button onClick={() => setExpanded(!expanded)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded mobile-touch">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : <div className="w-6" />}

            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs">
              {(user.full_name || user.phone || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{user.full_name || '(No name)'}</span>
                {user.user_id && <span className="text-xs text-muted-foreground">({user.user_id})</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Phone size={12} className="flex-shrink-0" />
                <span className="truncate">{user.phone}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium whitespace-nowrap">
                  <Shield size={10} /> {ROLE_LABELS[user.role as UserRole]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2">
            {user.role === 'executive' && availableManagers.length > 0 && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={newReportingTo}
                      onChange={(e) => setNewReportingTo(e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-border bg-background min-w-[120px] mobile-text"
                    >
                      <option value="">Select Team Leader</option>
                      {availableManagers?.map((manager: any) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.full_name} ({ROLE_LABELS[manager.role as UserRole]})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveReporting}
                      className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors mobile-touch"
                      title="Save"
                    >
                      <Save size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setNewReportingTo(user.reporting_to || '');
                      }}
                      className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors mobile-touch"
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground min-w-[100px] truncate">
                      {user.reporting_to ? 
                        availableManagers.find((m: any) => m.id === user.reporting_to)?.full_name || 'Unknown TL' 
                        : 'No Team Leader'
                      }
                    </span>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors mobile-touch"
                      title="Assign to Team Leader"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {children.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md whitespace-nowrap">
                {children.length} {children.length === 1 ? 'member' : 'members'}
              </span>
            )}
          </div>
        </div>

        {expanded && children.length > 0 && (
          <div className="w-full">
            {children.map((child: any) => (
              <UserHierarchyNode 
                key={child.id} 
                user={child} 
                childrenMap={childrenMap} 
                level={level + 1} 
                onUpdateReporting={onUpdateReporting}
                availableManagers={availableManagers}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function TeamUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: '',
    phone: '',
    mpin: '',
    role: 'executive' as 'team_leader' | 'executive',
    reporting_to: user?.id || null,
    branch_id: user?.role === 'branch_manager' ? user?.branch_id : null
  });

  const { data: teamData = [], isLoading, error } = useQuery({
    queryKey: ['team-hierarchy', user?.id],
    queryFn: async () => {
      const isHierarchyRole = ['manager', 'dsa', 'branch_manager', 'sales_manager'].includes(user?.role || '');
      const endpoint = isHierarchyRole
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/users/my-team/hierarchy`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/users/team/${user?.id}`;

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch team');
      return await response.json();
    },
    enabled: !!user?.id,
  });

  const updateReporting = useMutation({
    mutationFn: async ({ userId, reportingTo }: { userId: number; reportingTo: string }) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ reporting_to: reportingTo || null })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update reporting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      toast.success('Reporting updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update reporting');
    }
  });

  const handleUpdateReporting = (userId: number, reportingTo: string) => {
    updateReporting.mutate({ userId, reportingTo });
  };

  const createUser = useMutation({
    mutationFn: async () => {
      const userData = {
        full_name: newUser.full_name,
        phone: newUser.phone,
        mpin: newUser.mpin,
        role: newUser.role,
        reporting_to: newUser.reporting_to,
        branch_id: newUser.branch_id
      };
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(userData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      toast.success('User created successfully!');
      setShowAddModal(false);
      setNewUser({
        full_name: '',
        phone: '',
        mpin: '',
        role: 'executive',
        reporting_to: user?.id || null,
        branch_id: user?.role === 'branch_manager' ? user?.branch_id : null
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    }
  });

  // Flatten team data for filtering
  const flattenTeam = (data: any[]): any[] => {
    let flat: any[] = [];
    data.forEach(item => {
      flat.push(item);
      if (item.team_members) {
        flat = flat.concat(item.team_members);
      }
    });
    return flat;
  };

  const flatTeam = flattenTeam(teamData);

  const { filteredHierarchy, roleCounts } = useMemo(() => {
    const filtered = flatTeam.filter((u: any) => {
      const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });

    const counts = filtered.reduce((acc: Record<string, number>, u: any) => {
      if (u.role) acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    // Rebuild hierarchy with filtered items
    const filteredSet = new Set(filtered.map((u: any) => u.id));
    const hierarchy = teamData
      .filter((leader: any) => filteredSet.has(leader.id))
      .map((leader: any) => ({
        ...leader,
        team_members: leader.team_members?.filter((m: any) => filteredSet.has(m.id)) || []
      }));

    return { filteredHierarchy: hierarchy, roleCounts: counts };
  }, [teamData, search, roleFilter]);

  // Get available managers for reporting change (only team leaders under current user)
  const availableManagers = useMemo(() => {
    if (user?.role === 'branch_manager' || user?.role === 'dsa') {
      // BM/DSA can assign to team leaders under them
      const teamLeaders = flatTeam.filter((u: any) => 
        u.role === 'team_leader' && u.reporting_to === user.id
      );
      return teamLeaders;
    } else if (user?.role === 'team_leader') {
      // Team leaders can assign to themselves or other team leaders at same level
      const teamLeaders = flatTeam.filter((u: any) => 
        u.role === 'team_leader' && (u.id === user.id || u.reporting_to === user.reporting_to)
      );
      return teamLeaders;
    }
    return [];
  }, [flatTeam, user]);

  const isManager = ['manager', 'dsa', 'branch_manager', 'sales_manager'].includes(user?.role || '');

  return (
    <div className="mobile-scroll">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Team</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isManager ? 'View your team leaders and their team members' : 'View and manage your team members'}
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm mobile-touch"
          >
            <UserPlus size={16} /> Add User
          </button>
        )}
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const count = roleCounts[role] || 0;
          return count > 0 ? (
            <div
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`stat-card cursor-pointer text-center transition-all duration-200 hover:scale-105 mobile-touch ${roleFilter === role ? 'ring-2 ring-accent bg-accent/5' : 'hover:bg-muted/50'}`}
            >
              <p className="text-lg sm:text-xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
            </div>
          ) : null;
        })}
      </div>

      {/* Search */}
      <div className="stat-card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search team members by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all mobile-text"
          />
        </div>
      </div>

      {/* Hierarchy View */}
      <div className="stat-card">
        <h3 className="text-md font-semibold mb-4 text-foreground flex items-center gap-2">
          <Shield size={18} className="text-accent" /> Team Structure
        </h3>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading team hierarchy…</div>
        ) : error ? (
          <div className="py-8 text-center text-destructive text-sm">Error loading team structure.</div>
        ) : filteredHierarchy.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm font-medium">No team members found</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            {isManager ? (
              // Manager view: show team leaders with their members
              filteredHierarchy.map((leader: any) => {
                const childrenMap = { [leader.id]: leader.team_members || [] };
                return (
                  <UserHierarchyNode 
                    key={leader.id}
                    user={leader} 
                    childrenMap={childrenMap} 
                    level={0} 
                    onUpdateReporting={handleUpdateReporting}
                    availableManagers={availableManagers}
                  />
                );
              })
            ) : (
              // Team leader view: show direct team members
              filteredHierarchy.map((member: any) => (
                <UserHierarchyNode 
                  key={member.id} 
                  user={member} 
                  childrenMap={{}} 
                  level={0} 
                  onUpdateReporting={handleUpdateReporting}
                  availableManagers={availableManagers}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Add New User</h3>
                <p className="text-sm text-muted-foreground mt-1">Create a team leader or executive</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-muted">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent mobile-text"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent mobile-text"
                  placeholder="Enter phone number"
                  maxLength={10}
                  pattern="[0-9]{10}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">MPIN *</label>
                <input
                  type="password"
                  required
                  value={newUser.mpin}
                  onChange={(e) => setNewUser({ ...newUser, mpin: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent mobile-text"
                  placeholder="Enter 4-digit MPIN"
                  maxLength={4}
                  pattern="[0-9]{4}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role *</label>
                <select
                  required
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'team_leader' | 'executive' })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent mobile-text"
                >
                  <option value="team_leader">Team Leader</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reports To</label>
                <select
                  value={newUser.reporting_to || ''}
                  onChange={(e) => setNewUser({ ...newUser, reporting_to: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent mobile-text"
                >
                  <option value="">Select Manager</option>
                  {availableManagers?.map((manager: any) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({ROLE_LABELS[manager.role as UserRole]})
                    </option>
                  ))}
                  {/* Also show current user as option for managers */}
                  {['manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader'].includes(user?.role || '') && (
                    <option value={user?.id}>
                      {user?.name || user?.full_name} (You - {ROLE_LABELS[user?.role as UserRole]})
                    </option>
                  )}
                </select>
              </div>

              {newUser.role === 'team_leader' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Branch *</label>
                  <input
                    type="text"
                    disabled
                    value={newUser.branch_id ? `Branch ID: ${newUser.branch_id}` : 'No branch assigned'}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground text-sm"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending || (newUser.role === 'team_leader' && !newUser.branch_id) || !newUser.full_name || !newUser.phone || !newUser.mpin}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity font-medium disabled:opacity-50 mobile-touch"
                >
                  {createUser.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
