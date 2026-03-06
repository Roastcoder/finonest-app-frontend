import { Link, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { LayoutDashboard, FileText, Car, Users, UserPlus, BarChart3 } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'manager', 'executive'] },
  { label: 'Leads', path: '/leads-list', icon: <UserPlus size={20} />, roles: ['admin', 'manager', 'executive'] },
  { label: 'Loans', path: '/loans', icon: <FileText size={20} />, roles: ['admin', 'manager', 'executive'] },
  { label: 'New', path: '/loans/new', icon: <Car size={20} />, roles: ['admin', 'manager', 'executive'] },
  { label: 'Users', path: '/users', icon: <Users size={20} />, roles: ['admin', 'manager'] },
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={20} />, roles: ['admin', 'manager'] },
];

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const filteredNav = MOBILE_NAV_ITEMS.filter(item => !user.role || item.roles.includes(user.role));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {filteredNav.slice(0, 5).map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${active
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <span className={active ? 'scale-110' : ''}>{item.icon}</span>
              <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
