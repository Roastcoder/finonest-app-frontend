import React, { ReactNode, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/auth';
import {
  LayoutDashboard, FileText, Users, Building2, UserCheck, BarChart3,
  LogOut, Menu, X, Car, Bell, CreditCard, Shield, ChevronLeft, ChevronRight, MapPin, UserPlus, Settings,
  Wallet, Receipt, ShieldCheck, Sliders, ChevronDown, ChevronUp, Folder, Copy, Share2, UserCircle, Download, Eye, Calendar
} from 'lucide-react';
import MobileBottomNav from './MobileBottomNav';
import { toast } from 'sonner';
import NotificationBell from './NotificationBell';
import { useDashboardContextSafe } from '@/pages/Dashboard';


interface NavItem {
  label: string;
  path?: string;
  icon: ReactNode;
  roles: UserRole[];
  children?: { label: string; path: string; icon?: ReactNode; roles: UserRole[] }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
  {
    label: 'Leads & Loans', icon: <Folder size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'],
    children: [
      { label: 'Leads', path: '/leads-list', icon: <UserPlus size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
      { label: 'Loan Apps', path: '/loans', icon: <FileText size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader'] },
    ]
  },
  { label: 'Team', path: '/team', icon: <Users size={18} />, roles: ['manager', 'sales_manager', 'team_leader', 'dsa', 'branch_manager'] },
  {
    label: 'Operations', icon: <ShieldCheck size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'executive'],
    children: [
      { label: 'RC Limits', path: '/rc-limits', icon: <Wallet size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
      { label: 'Payouts', path: '/payouts', icon: <Receipt size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
      { label: 'Expenses', path: '/expenses', icon: <CreditCard size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
      { label: 'Insurance', path: '/insurance', icon: <ShieldCheck size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager'] },
      { label: 'Link Loan Finder', path: '/link-loan-finder', icon: <Shield size={16} />, roles: ['admin', 'sales_manager', 'branch_manager'] },
    ]
  },
  {
    label: 'Administration', icon: <Settings size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'],
    children: [
      { label: 'Reports', path: '/reports', icon: <BarChart3 size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
      { label: 'Users', path: '/users', icon: <Users size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
      { label: 'My Team', path: '/my-team', icon: <Users size={16} />, roles: ['branch_manager'] },
      { label: 'Banks / NBFC', path: '/banks', icon: <Building2 size={16} />, roles: ['admin'] },
      { label: 'Brokers / DSA', path: '/brokers', icon: <UserCheck size={16} />, roles: ['admin'] },
      { label: 'Branches', path: '/branches', icon: <MapPin size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
      { label: 'Permissions', path: '/permissions', icon: <Settings size={16} />, roles: ['admin'] },
      { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={16} />, roles: ['admin'] },
      { label: 'System Config', path: '/settings', icon: <Sliders size={16} />, roles: ['admin'] },
    ]
  }
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const logo = '/Finonest%20logo.png';
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
      setFlyoutGroup(prev => prev === label ? null : label);
    } else {
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

      {/* Sidebar - Responsive with vh/vw */}
      <aside style={{
        width: collapsed ? 'clamp(3.5rem, 5vw, 3.5rem)' : 'clamp(11rem, 15vw, 11rem)',
        height: '100vh'
      }} className={`fixed lg:static inset-y-0 left-0 z-50 overflow-hidden glass-panel border-r border-white/50 dark:border-white/10 flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-2xl lg:rounded-none`}>
        {/* Logo */}
        <div style={{ height: 'clamp(4rem, 8vh, 4rem)' }} className={`flex items-center border-b border-white/20 dark:border-white/5 ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}>
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              <span className="text-white font-black text-sm tracking-tight">FI</span>
            </button>
          ) : (
            <>
              <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md flex-1 min-w-0" />
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 transition-all duration-300"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
              <button className="lg:hidden ml-auto text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
                <X size={20} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-2 px-2 space-y-0.5 relative z-10 custom-scrollbar ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {filteredNav.map(item => {
            if (item.children) {
              const isExpanded = expandedGroups[item.label];
              const hasActiveChild = item.children.some(child => location.pathname === child.path);

              return (
                <div key={item.label} className="flex flex-col mb-1 relative">
                  {/* Group Header Button */}
                  <button
                    onClick={() => toggleGroup(item.label)}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 w-full ${collapsed ? 'justify-center px-2' : ''
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
                        <span className="truncate tracking-wide flex-1 text-left text-xs">{item.label}</span>
                        <span className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''
                          }`}>
                          <ChevronDown size={14} />
                        </span>
                      </>
                    )}
                  </button>

                  {/* Collapsed Flyout Popover */}
                  {collapsed && flyoutGroup === item.label && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setFlyoutGroup(null)} />
                      <div className="fixed left-[5vw] z-50 w-48 glass-panel border border-white/30 dark:border-white/10 rounded-2xl shadow-2xl p-2 backdrop-blur-2xl" style={{ top: '8vh' }}>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 pb-1">{item.label}</p>
                        {item.children.map(child => {
                          const childActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => { setSidebarOpen(false); setFlyoutGroup(null); }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${childActive
                                  ? 'bg-primary text-secondary shadow-md'
                                  : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-white/60 dark:hover:bg-white/10'
                                }`}
                            >
                              <span className={childActive ? 'text-secondary' : 'text-gray-400'}>
                                {child.icon || <div className="w-1 h-1 rounded-full bg-current" />}
                              </span>
                              <span className="text-xs">{child.label}</span>
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
                      style={{ maxHeight: isExpanded ? `${item.children.length * 40}px` : '0px', opacity: isExpanded ? 1 : 0 }}
                    >
                      <div className="mx-1 mt-1 mb-0.5 p-1 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner">
                        {item.children.map(child => {
                          const childActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${childActive
                                ? 'bg-primary text-secondary shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-white/70 dark:hover:bg-white/10'
                                }`}
                            >
                              <span className={`shrink-0 ${childActive ? 'text-secondary' : 'text-gray-400 group-hover:text-primary'
                                } transition-colors`}>
                                {child.icon || <div className="w-1 h-1 rounded-full bg-current" />}
                              </span>
                              <span className="truncate text-xs">{child.label}</span>
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
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${collapsed ? 'justify-center px-2' : ''} ${active
                  ? 'bg-primary text-secondary shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-white/40 dark:hover:bg-white/5 border border-transparent'
                  }`}
              >
                <span className={`${active ? 'text-secondary drop-shadow-sm' : 'text-gray-400 group-hover:text-primary dark:group-hover:text-primary'} transition-colors duration-300`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate tracking-wide text-xs">{item.label}</span>}
                {!collapsed && active && (
                  <div className="ml-auto w-1 h-1 bg-white rounded-full shadow-sm" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className={`px-2 pb-3 pt-3 border-t border-white/20 dark:border-white/5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Refer Code Section */}
          {!collapsed && ['team_leader', 'branch_manager', 'dsa'].includes(user.role) && user.refer_code && (
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
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded-lg glass-card shadow-sm border border-white/40 dark:border-white/10">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[9px] shrink-0 shadow-sm border border-white/20">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-gray-900 dark:text-white truncate">{user.name || 'User'}</p>
                <p className="text-[8px] font-medium text-gray-500 dark:text-gray-400">{user.role ? ROLE_LABELS[user.role] : 'N/A'}</p>
              </div>
            </div>
          )}
          {collapsed ? (
            <button onClick={handleLogout} title="Logout" className="p-2 rounded-lg text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 border border-transparent hover:border-red-200 dark:hover:border-red-800/30">
              <LogOut size={16} />
            </button>
          ) : (
            <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold text-red-500 dark:text-red-400 hover:text-white hover:bg-red-500 transition-all duration-300 w-full border border-red-100 dark:border-red-900/50 hover:border-transparent hover:shadow-md">
              <LogOut size={14} />
              Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page - Responsive with vh/vw */}
        <main style={{ 
          padding: 'clamp(1rem, 3vw, 1.25rem)',
          paddingBottom: 'clamp(5rem, 10vh, 1.25rem)'
        }} className="flex-1 overflow-y-auto scroll-smooth">
          <div className="animate-fade-in w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
