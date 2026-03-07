import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Mail, Phone, Calendar } from 'lucide-react';

export default function TeamUsers() {
  const { user } = useAuth();

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/team/${user?.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch team members');
      return await response.json();
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users size={28} />
          My Team
        </h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage your team members</p>
      </div>

      {teamMembers.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <Users size={48} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No team members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member: any) => (
            <div key={member.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{member.name}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent capitalize">
                    {member.role}
                  </span>
                </div>
                <div className={`w-3 h-3 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
              
              <div className="space-y-2 text-sm">
                {member.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail size={14} />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={14} />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.joining_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={14} />
                    <span>Joined: {new Date(member.joining_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
