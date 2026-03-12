import React, { ReactNode, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/auth';
import {
  LayoutDashboard, FileText, Users, Building2, UserCheck, BarChart3,
  LogOut, Menu, X, Car, Bell, CreditCard, Shield, ChevronLeft, ChevronRight, MapPin, UserPlus, Settings,
  Wallet, Receipt, ShieldCheck, Sliders, ChevronDown, ChevronUp, Folder
} from 'lucide-react';
import logo from '@/assets/logo.png';
import MobileBottomNav from './MobileBottomNav';
import NotificationBell from './NotificationBell';


interface NavItem {
  label: string;
  path?: string;
  icon: ReactNode;
  roles: UserRole[];
  children?: { label: string; path: string; icon?: ReactNode; roles: UserRole[] }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'team_leader', 'executive'] },
  {
    label: 'Leads & Loans', icon: <Folder size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'team_leader', 'executive'],
    children: [
      { label: 'Leads', path: '/leads-list', icon: <UserPlus size={16} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'team_leader', 'executive'] },
      { label: 'Loan Apps', path: '/loans', icon: <FileText size={16} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'team_leader'] },
    ]
  },
  { label: 'My Team', path: '/team', icon: <Users size={18} />, roles: ['manager', 'team_leader'] },
  {
    label: 'Operations', icon: <ShieldCheck size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'executive'],
    children: [
      { label: 'RC Limits', path: '/rc-limits', icon: <Wallet size={16} />, roles: ['admin', 'ops_team', 'manager', 'dsa'] },
      { label: 'Payouts', path: '/payouts', icon: <Receipt size={16} />, roles: ['admin', 'manager', 'dsa'] },
      { label: 'Expenses', path: '/expenses', icon: <CreditCard size={16} />, roles: ['admin', 'ops_team', 'manager', 'dsa'] },
      { label: 'Insurance', path: '/insurance', icon: <ShieldCheck size={16} />, roles: ['admin', 'ops_team', 'manager'] },
    ]
  },
  {
    label: 'Accountant', icon: <Wallet size={18} />, roles: ['accountant'],
    children: [
      { label: 'Dashboard', path: '/accountant/dashboard', icon: <BarChart3 size={16} />, roles: ['accountant'] },
      { label: 'Folio Accounts', path: '/accountant/folio', icon: <Wallet size={16} />, roles: ['accountant'] },
      { label: 'Acct Payments', path: '/accountant/payments', icon: <Receipt size={16} />, roles: ['accountant'] },
      { label: 'Bank Accounts', path: '/accountant/bank-accounts', icon: <Building2 size={16} />, roles: ['accountant'] },
    ]
  },
  {
    label: 'Administration', icon: <Settings size={18} />, roles: ['admin', 'manager', 'ops_team', 'dsa'],
    children: [
      { label: 'Reports', path: '/reports', icon: <BarChart3 size={16} />, roles: ['admin', 'manager', 'dsa'] },
      { label: 'Users', path: '/users', icon: <Users size={16} />, roles: ['admin', 'manager'] },
      { label: 'Banks / NBFC', path: '/banks', icon: <Building2 size={16} />, roles: ['admin'] },
      { label: 'Brokers / DSA', path: '/brokers', icon: <UserCheck size={16} />, roles: ['admin'] },
      { label: 'Branches', path: '/branches', icon: <MapPin size={16} />, roles: ['admin', 'manager', 'ops_team'] },
      { label: 'Permissions', path: '/permissions', icon: <Settings size={16} />, roles: ['admin'] },
      { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={16} />, roles: ['admin'] },
      { label: 'System Config', path: '/settings', icon: <Sliders size={16} />, roles: ['admin'] },
    ]
  }
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);

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

  const toggleGroup = (label: string) => {
    if (collapsed) {
      // In collapsed mode: show flyout popover, don't expand sidebar
      setFlyoutGroup(prev => prev === label ? null : label);
    } else {
      // Already expanded: normal toggle
      setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${collapsed ? 'w-20 overflow-visible' : 'w-60 overflow-hidden'} glass-panel border-r border-white/50 dark:border-white/10 flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-2xl lg:m-4 lg:mr-2 rounded-[2.5rem] lg:h-[calc(100vh-2rem)]`}>
        {/* Logo */}
        <div className={`flex items-center h-24 border-b border-white/20 dark:border-white/5 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
          {collapsed ? (
            /* In collapsed mode, the whole badge is the expand button */
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              <span className="text-white font-black text-lg tracking-tight">FI</span>
            </button>
          ) : (
            <>
              <img src={logo} alt="Finonest India" className="h-16 w-auto object-contain drop-shadow-md flex-1 min-w-0" />
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex shrink-0 p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 transition-all duration-300"
                title="Collapse sidebar"
              >
                <ChevronLeft size={18} />
              </button>
              <button className="lg:hidden ml-auto text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
                <X size={20} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-4 px-4 space-y-1.5 relative z-10 custom-scrollbar ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {filteredNav.map(item => {
            if (item.children) {
              const isExpanded = expandedGroups[item.label];
              const hasActiveChild = item.children.some(child => location.pathname === child.path);

              return (
                <div key={item.label} className="flex flex-col mb-2 relative">
                  {/* Group Header Button */}
                  <button
                    onClick={() => toggleGroup(item.label)}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 w-full ${collapsed ? 'justify-center px-3' : ''
                      } ${hasActiveChild || isExpanded || flyoutGroup === item.label
                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    <span className={`shrink-0 ${hasActiveChild || isExpanded || flyoutGroup === item.label ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
                      } transition-colors duration-300`}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="truncate tracking-wide flex-1 text-left">{item.label}</span>
                        <span className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''
                          }`}>
                          <ChevronDown size={15} />
                        </span>
                      </>
                    )}
                  </button>

                  {/* Collapsed Flyout Popover */}
                  {collapsed && flyoutGroup === item.label && (
                    <>
                      {/* backdrop to close */}
                      <div className="fixed inset-0 z-40" onClick={() => setFlyoutGroup(null)} />
                      <div className="fixed left-[88px] z-50 w-52 glass-panel border border-white/30 dark:border-white/10 rounded-2xl shadow-2xl p-2 backdrop-blur-2xl" style={{ top: '80px' }}>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 pb-1.5">{item.label}</p>
                        {item.children.map(child => {
                          const childActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => { setSidebarOpen(false); setFlyoutGroup(null); }}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${childActive
                                  ? 'bg-primary text-secondary shadow-md'
                                  : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10'
                                }`}
                            >
                              <span className={childActive ? 'text-secondary' : 'text-gray-400'}>
                                {child.icon || <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                              </span>
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Expanded Dropdown Children */}
                  {!collapsed && (
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{ maxHeight: isExpanded ? `${item.children.length * 48}px` : '0px', opacity: isExpanded ? 1 : 0 }}
                    >
                      <div className="mx-2 mt-1.5 mb-0.5 p-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
                        {item.children.map(child => {
                          const childActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${childActive
                                ? 'bg-primary text-secondary shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-white/70 dark:hover:bg-white/10'
                                }`}
                            >
                              <span className={`shrink-0 ${childActive ? 'text-secondary' : 'text-gray-400 group-hover:text-primary'
                                } transition-colors`}>
                                {child.icon || <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                              </span>
                              <span className="truncate">{child.label}</span>
                              {childActive && <div className="ml-auto w-1 h-1 rounded-full bg-white/70" />}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path || '#'}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${collapsed ? 'justify-center px-3' : ''} ${active
                  ? 'bg-primary text-secondary shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white/40 dark:hover:bg-white/5 border border-transparent'
                  }`}
              >
                <span className={`${active ? 'text-secondary drop-shadow-sm' : 'text-gray-400 group-hover:text-primary dark:group-hover:text-primary'} transition-colors duration-300`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate tracking-wide">{item.label}</span>}
                {!collapsed && active && (
                  <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className={`px-4 pb-6 pt-6 border-t border-white/20 dark:border-white/5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-4 px-4 py-3 mb-4 rounded-2xl glass-card shadow-sm border border-white/40 dark:border-white/10">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm border border-white/20">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || 'User'}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{user.role ? ROLE_LABELS[user.role] : 'No role'}</p>
                {user.role === 'executive' && (
                  <p className="text-xs text-primary dark:text-primary font-medium">
                    Team Laeder: {user.manager_name || 'No team leader assigned'}
                  </p>
                )}
              </div>
            </div>
          )}
          {collapsed ? (
            <button onClick={handleLogout} title="Logout" className="p-3 rounded-2xl text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 border border-transparent hover:border-red-200 dark:hover:border-red-800/30">
              <LogOut size={20} />
            </button>
          ) : (
            <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-4 py-3 rounded-full text-sm font-bold text-red-500 dark:text-red-400 hover:text-white hover:bg-red-500 transition-all duration-300 w-full border border-red-100 dark:border-red-900/50 hover:border-transparent hover:shadow-md">
              <LogOut size={18} />
              Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 lg:h-16 lg:mt-4 lg:mx-4 glass-panel border border-white/20 dark:border-white/5 rounded-2xl lg:rounded-[2rem] flex items-center px-4 lg:px-6 gap-3 lg:gap-6 shrink-0 shadow-sm z-40 lg:mb-2 bg-white/5 dark:bg-black/10 backdrop-blur-xl">
          {/* Mobile: Logo */}
          <div className="lg:hidden flex items-center">
            <img src={logo} alt="Finonest India" className="h-8 w-auto object-contain drop-shadow-md" />
          </div>

          {/* Page title / User greeting */}
          <div className="flex-1 min-w-0 flex items-center lg:ml-2 lg:border-l border-white/50 dark:border-white/10 lg:pl-6 h-8 lg:h-10">
            <div>
              <p className="text-sm lg:text-base font-bold text-gray-900 dark:text-white truncate tracking-tight drop-shadow-sm">
                Hi, <span className="text-primary dark:text-primary">{user.name?.split(' ')[0] || 'User'}</span>
              </p>
              <p className="text-xs lg:text-xs text-gray-600 dark:text-gray-400 font-medium truncate tracking-wide">
                {user.role ? ROLE_LABELS[user.role] : 'User'}
              </p>
            </div>
          </div>


          {/* Notification Bell */}
          <div className="bg-white/80 dark:bg-gray-800 rounded-full p-1.5 lg:p-2 shadow-sm border border-gray-200/50 dark:border-gray-700 hover:shadow-md transition-colors cursor-pointer group">
            <div className="text-gray-600 group-hover:text-primary transition-colors">
              <NotificationBell />
            </div>
          </div>

          {/* Profile Avatar */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-primary font-bold text-xs lg:text-sm shadow-sm border border-gray-200/50 dark:border-gray-700 hover:shadow-md transition-all"
            >
              {initials}
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-12 lg:top-14 w-60 glass-panel border border-white/20 dark:border-white/5 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all backdrop-blur-2xl bg-white/10 dark:bg-black/20">
                  <div className="p-4 border-b border-white/10">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || 'User'}</p>
                    <p className="text-xs font-semibold text-primary dark:text-primary">{user.role ? ROLE_LABELS[user.role] : 'No role'}</p>
                    {user.role === 'executive' && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Team: {user.manager_name || 'No team leader assigned'}
                      </p>
                    )}
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { handleLogout(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-all"
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
