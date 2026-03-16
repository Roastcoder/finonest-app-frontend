import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, Shield, ChevronDown, ChevronRight, UserPlus, X } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@/lib/auth';
import { toast } from 'sonner';

const UserHierarchyNode = ({ user, childrenMap, level = 0 }: any) => {
  const [expanded, setExpanded] = useState(true);
  const children = childrenMap[user.id] || [];

  return (
    <div className="w-full">
      <div
        className={`flex items-center justify-between p-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${level > 0 ? 'border-l-2 border-l-accent' : ''}`}
        style={{ paddingLeft: `${Math.max(0.75, level * 2)}rem` }}
      >
        <div className="flex items-center gap-3">
          {children.length > 0 ? (
            <button onClick={() => setExpanded(!expanded)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : <div className="w-6" />}

          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs">
            {(user.full_name || user.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-medium text-foreground">{user.full_name || '(No name)'}</span>
            {user.user_id && <span className="text-xs text-muted-foreground ml-2">({user.user_id})</span>}
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-32 hidden md:block">
            {user.role ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent text-[10px] font-medium truncate max-w-full">
                <Shield size={10} className="shrink-0" /> {ROLE_LABELS[user.role as UserRole]}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">No role</span>
            )}
          </div>
          <div className="w-24 hidden lg:block text-xs text-muted-foreground truncate">
            {user.phone || '—'}
          </div>
        </div>
      </div>

      {expanded && children.length > 0 && (
        <div className="w-full">
          {children.map((child: any) => (
            <UserHierarchyNode key={child.id} user={child} childrenMap={childrenMap} level={level + 1} />
          ))}
        </div>
      )}
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
    email: '',
    phone: '',
    password: '',
    role: 'executive' as 'team_leader' | 'executive',
    reporting_to: user?.id || null
  });

  const { data: teamData = [], isLoading, error } = useQuery({
    queryKey: ['team-hierarchy', user?.id],
    queryFn: async () => {
      const isHierarchyRole = ['manager', 'dsa', 'branch_manager', 'sales_manager'].includes(user?.role || '');
      const endpoint = isHierarchyRole
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/my-team/hierarchy`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/team/${user?.id}`;

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch team');
      return await response.json();
    },
    enabled: !!user?.id,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(newUser)
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
        email: '',
        phone: '',
        password: '',
        role: 'executive',
        reporting_to: user?.id || null
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
        u.email?.toLowerCase().includes(search.toLowerCase());
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

  const isManager = ['manager', 'dsa', 'branch_manager', 'sales_manager'].includes(user?.role || '');

  return (
    <div>
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
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <UserPlus size={16} /> Add User
          </button>
        )}
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const count = roleCounts[role] || 0;
          return count > 0 ? (
            <div
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`stat-card cursor-pointer text-center ${roleFilter === role ? 'ring-2 ring-accent' : ''}`}
            >
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
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
            placeholder="Search team members by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
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
          <p className="text-center text-muted-foreground py-8 text-sm">No team members found</p>
        ) : (
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            {isManager ? (
              // Manager view: show team leaders with their members
              filteredHierarchy.map((leader: any) => (
                <div key={leader.id}>
                  <UserHierarchyNode user={leader} childrenMap={{}} level={0} />
                  {leader.team_members && leader.team_members.length > 0 && (
                    <div>
                      {leader.team_members.map((member: any) => (
                        <UserHierarchyNode key={member.id} user={member} childrenMap={{}} level={1} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Team leader view: show direct team members
              filteredHierarchy.map((member: any) => (
                <UserHierarchyNode key={member.id} user={member} childrenMap={{}} level={0} />
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
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  placeholder="Enter phone number"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                  placeholder="Enter password"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role *</label>
                <select
                  required
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'team_leader' | 'executive' })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                >
                  <option value="team_leader">Team Leader</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

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
                  disabled={createUser.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
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
