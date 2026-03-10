import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ROLE_LABELS, UserRole } from '@/lib/auth';
import { Users, Search, Shield, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { RoleAssignModal } from '@/components/RoleAssignModal';

const UserHierarchyNode = ({ user, childrenMap, handleAssignRole, level = 0 }: any) => {
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
            {user.branch_name || '—'}
          </div>
          <button onClick={() => handleAssignRole(user)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Edit size={14} />
          </button>
        </div>
      </div>

      {expanded && children.length > 0 && (
        <div className="w-full">
          {children.map((child: any) => (
            <UserHierarchyNode key={child.id} user={child} childrenMap={childrenMap} handleAssignRole={handleAssignRole} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

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
      // Changed to the hierarchy endpoint for visualizing the report structure
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/hierarchy`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch hierarchy');
      return res.json();
    },
    enabled: !!user,
  });

  const { filteredHierarchyMap, rootUsers } = useMemo(() => {
    let map: Record<number, any[]> = {};
    let roots: any[] = [];

    // Convert to filtered flat list then rebuild
    const filtered = rawUsers.filter((u: any) => {
      const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });

    const filteredSet = new Set(filtered.map((u: any) => u.id));

    // Simple rebuilding logic prioritizing root nodes or items who's parent got filtered out
    filtered.forEach((u: any) => {
      if (!u.reporting_to || !filteredSet.has(u.reporting_to)) {
        roots.push(u);
      } else {
        if (!map[u.reporting_to]) map[u.reporting_to] = [];
        map[u.reporting_to].push(u);
      }
    });

    return { filteredHierarchyMap: map, rootUsers: roots, flatCount: filtered.length };
  }, [rawUsers, search, roleFilter]);

  const roleCounts = rawUsers.reduce((acc: Record<string, number>, u: any) => {
    if (u.role) acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage system users, roles, and reporting hierarchy</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'team_leader') && (
          <button
            onClick={() => {
              setSelectedUser(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <Users size={16} /> {user?.role === 'team_leader' ? 'Add Team Member' : 'Add New User'}
          </button>
        )}
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

      {/* Hierarchy View */}
      <div className="stat-card">
        <h3 className="text-md font-semibold mb-4 text-foreground flex items-center gap-2">
          <Shield size={18} className="text-accent" /> Hierarchy Structure
        </h3>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading user hierarchy…</div>
        ) : error ? (
          <div className="py-8 text-center text-destructive text-sm">Error loading hierarchy structure.</div>
        ) : rootUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>
        ) : (
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            {rootUsers.map((rootUser) => (
              <UserHierarchyNode
                key={rootUser.id}
                user={rootUser}
                childrenMap={filteredHierarchyMap}
                handleAssignRole={handleAssignRole}
              />
            ))}
          </div>
        )}
      </div>

      <RoleAssignModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refetch} user={selectedUser} />
    </div>
  );
}
