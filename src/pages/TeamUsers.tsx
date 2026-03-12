import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@/lib/auth';

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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { data: teamData = [], isLoading, error } = useQuery({
    queryKey: ['team-hierarchy', user?.id],
    queryFn: async () => {
      const endpoint = user?.role === 'manager'
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

  const isManager = user?.role === 'manager';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Team</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isManager ? 'View your team leaders and their team members' : 'View and manage your team members'}
          </p>
        </div>
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
    </div>
  );
}
