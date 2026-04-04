import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/auth';
import {
  LayoutDashboard, FileText, Users, Building2, UserCheck, BarChart3,
  LogOut, X, MapPin, UserPlus, Settings, Wallet, Receipt, ShieldCheck,
  Sliders, ChevronDown, Folder, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  roles: UserRole[];
  children?: { label: string; path: string; icon?: React.ReactNode; roles: UserRole[] }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
  {
    label: 'Leads & Loans', icon: <Folder size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'],
    children: [
      { label: 'Leads', path: '/leads-list', icon: <UserPlus size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
      { label: 'Loan Apps', path: '/loans', icon: <FileText size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
    ]
  },
  { label: 'Team', path: '/team', icon: <Users size={18} />, roles: ['manager', 'sales_manager', 'team_leader', 'dsa', 'branch_manager'] },
  {
    label: 'Operations', icon: <ShieldCheck size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'executive'],
    children: [
      { label: 'RC Limits', path: '/rc-limits', icon: <Wallet size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
      { label: 'Payouts', path: '/payouts', icon: <Receipt size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
      { label: 'Expenses', path: '/expenses', icon: <FileText size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
      { label: 'Insurance', path: '/insurance', icon: <ShieldCheck size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager'] },
      { label: 'Find My Lender', path: '/find-lender', icon: <MapPin size={16} />, roles: ['admin', 'sales_manager', 'branch_manager', 'dsa'] },
    ]
  },
  {
    label: 'Administration', icon: <Settings size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'],
    children: [
      { label: 'Reports', path: '/reports', icon: <BarChart3 size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
      { label: 'Users', path: '/users', icon: <Users size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
      { label: 'Banks / NBFC', path: '/banks', icon: <Building2 size={16} />, roles: ['admin'] },
      { label: 'Brokers / DSA', path: '/brokers', icon: <UserCheck size={16} />, roles: ['admin'] },
      { label: 'Branches', path: '/branches', icon: <MapPin size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
      { label: 'Permissions', path: '/permissions', icon: <Settings size={16} />, roles: ['admin'] },
      { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={16} />, roles: ['admin'] },
      { label: 'System Config', path: '/settings', icon: <Sliders size={16} />, roles: ['admin'] },
    ]
  }
];

export default function MobileSidebar() {
  const { user, logout } = useAuth();
  const logo = '/Finonest%20logo.png';
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  if (!user) return null;

  const filteredNav = NAV_ITEMS.filter(item => !user.role || item.roles.includes(user.role)).map(item => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => !user.role || child.roles.includes(user.role))
      };
    }
    return item;
  }).filter(item => !item.children || item.children.length > 0);

  // Swipe gesture - swipe right from left edge to open sidebar
  useSwipeGesture({
    onSwipeRight: () => {
      if (window.innerWidth < 1024 && !isOpen) {
        setIsOpen(true);
      }
    },
    onSwipeLeft: () => {
      if (window.innerWidth < 1024 && isOpen) {
        setIsOpen(false);
      }
    }
  }, 100);

  // Listen for openSidebar event from More button
  useEffect(() => {
    const handleOpenSidebar = () => setIsOpen(true);
    window.addEventListener('openSidebar', handleOpenSidebar);
    return () => window.removeEventListener('openSidebar', handleOpenSidebar);
  }, []);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-[200] lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 right-0 z-[201] w-[280px] glass-panel border-l border-white/50 dark:border-white/10 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} shadow-2xl`}>
        {/* Logo */}
        <div className="h-16 flex items-center border-b border-white/20 dark:border-white/5 gap-3 px-3">
          <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md flex-1 min-w-0" />
          <button className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {filteredNav.map(item => {
            if (item.children) {
              const isExpanded = expandedGroups[item.label];
              const hasActiveChild = item.children.some(child => location.pathname === child.path);

              return (
                <div key={item.label} className="flex flex-col mb-1">
                  {/* Group Header Button */}
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 w-full ${hasActiveChild || isExpanded
                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    <span className={`shrink-0 ${hasActiveChild || isExpanded ? 'text-primary' : 'text-gray-400 group-hover:text-primary'} transition-colors duration-300`}>
                      {item.icon}
                    </span>
                    <span className="truncate tracking-wide flex-1 text-left text-xs">{item.label}</span>
                    <span className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`}>
                      <ChevronDown size={14} />
                    </span>
                  </button>

                  {/* Expanded Dropdown Children */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: isExpanded ? `${item.children.length * 40}px` : '0px', opacity: isExpanded ? 1 : 0 }}
                  >
                    <div className="mx-1 mt-1 mb-0.5 p-1 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
                      {item.children.map(child => {
                        const childActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => setIsOpen(false)}
                            className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${childActive
                              ? 'bg-primary text-secondary shadow-md'
                              : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-white/70 dark:hover:bg-white/10'
                              }`}
                          >
                            <span className={`shrink-0 ${childActive ? 'text-secondary' : 'text-gray-400 group-hover:text-primary'} transition-colors`}>
                              {child.icon || <div className="w-1 h-1 rounded-full bg-current" />}
                            </span>
                            <span className="truncate text-xs">{child.label}</span>
                            {childActive && <div className="ml-auto w-1 h-1 rounded-full bg-white/70" />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path || '#'}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${active
                  ? 'bg-primary text-secondary shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white/40 dark:hover:bg-white/5 border border-transparent'
                  }`}
              >
                <span className={`${active ? 'text-secondary drop-shadow-sm' : 'text-gray-400 group-hover:text-primary dark:group-hover:text-primary'} transition-colors duration-300`}>
                  {item.icon}
                </span>
                <span className="truncate tracking-wide text-xs">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1 h-1 bg-white rounded-full shadow-sm" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2 pb-3 pt-3 border-t border-white/20 dark:border-white/5">
          {/* Refer Code Section */}
          {['team_leader', 'branch_manager', 'dsa'].includes(user.role) && user.refer_code && (
            <div className="mb-2 px-2 py-1.5 rounded-lg glass-card shadow-sm border border-white/40 dark:border-white/10">
              <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400 mb-1">Refer Code</p>
              <div className="flex items-center gap-1">
                <code className="flex-1 text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-1 rounded">
                  {user.refer_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.refer_code);
                    toast.success('Refer code copied!');
                  }}
                  className="p-1 rounded hover:bg-white/50 dark:hover:bg-white/10 text-gray-500 hover:text-primary transition-colors"
                  title="Copy"
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded-lg glass-card shadow-sm border border-white/40 dark:border-white/10">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[9px] shrink-0 shadow-sm border border-white/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-gray-900 dark:text-white truncate">{user.name || 'User'}</p>
              <p className="text-[8px] font-medium text-gray-500 dark:text-gray-400">{user.role ? ROLE_LABELS[user.role] : 'N/A'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold text-red-500 dark:text-red-400 hover:text-white hover:bg-red-500 transition-all duration-300 w-full border border-red-100 dark:border-red-900/50 hover:border-transparent hover:shadow-md">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
