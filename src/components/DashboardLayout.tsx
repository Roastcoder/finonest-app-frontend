import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/auth';
import {
  LayoutDashboard, FileText, Users, Building2, UserCheck, BarChart3,
  LogOut, Menu, X, Car, Bell, CreditCard, Shield, ChevronLeft, ChevronRight, MapPin, UserPlus, Settings,
  Wallet, Receipt, ShieldCheck, Sliders
} from 'lucide-react';
import logo from '@/assets/logo.png';
import MobileBottomNav from './MobileBottomNav';
import NotificationBell from './NotificationBell';


interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'team_leader', 'executive'] },
  { label: 'Leads', path: '/leads-list', icon: <UserPlus size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'team_leader', 'executive'] },
  { label: 'Loan Applications', path: '/loans', icon: <FileText size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'team_leader', 'executive'] },
  { label: 'Create Loan', path: '/loans/new', icon: <Car size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'team_leader', 'executive'] },
  { label: 'My Team', path: '/team', icon: <Users size={18} />, roles: ['team_leader'] },
  { label: 'PDD Tracking', path: '/pdd', icon: <Shield size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa', 'executive'] },

  // Accountant Portal
  { label: 'Accountant Dashboard', path: '/accountant/dashboard', icon: <BarChart3 size={18} />, roles: ['accountant'] },
  { label: 'Folio Accounts', path: '/accountant/folio', icon: <Wallet size={18} />, roles: ['accountant'] },
  { label: 'Account Payments', path: '/accountant/payments', icon: <Receipt size={18} />, roles: ['accountant'] },
  { label: 'Bank Accounts', path: '/accountant/bank-accounts', icon: <Building2 size={18} />, roles: ['accountant'] },

  // New PRD Modules
  { label: 'RC Limits', path: '/rc-limits', icon: <Wallet size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa'] },
  { label: 'Payouts', path: '/payouts', icon: <Receipt size={18} />, roles: ['admin', 'manager', 'dsa'] },
  { label: 'Expenses', path: '/expenses', icon: <CreditCard size={18} />, roles: ['admin', 'ops_team', 'manager', 'dsa'] },
  { label: 'Insurance', path: '/insurance', icon: <ShieldCheck size={18} />, roles: ['admin', 'ops_team', 'manager'] },

  // Admin & Reports
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={18} />, roles: ['admin', 'manager', 'dsa'] },
  { label: 'Users', path: '/users', icon: <Users size={18} />, roles: ['admin', 'manager'] },
  { label: 'Banks / NBFC', path: '/banks', icon: <Building2 size={18} />, roles: ['admin'] },
  { label: 'Brokers / DSA', path: '/brokers', icon: <UserCheck size={18} />, roles: ['admin'] },
  { label: 'Branches', path: '/branches', icon: <MapPin size={18} />, roles: ['admin', 'manager', 'ops_team'] },
  { label: 'Permissions', path: '/permissions', icon: <Settings size={18} />, roles: ['admin'] },
  { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={18} />, roles: ['admin'] },
  { label: 'System Config', path: '/settings', icon: <Sliders size={18} />, roles: ['admin'] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const filteredNav = NAV_ITEMS.filter(item => !user.role || item.roles.includes(user.role));

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
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${collapsed ? 'w-20' : 'w-60'} glass-panel border-r border-white/50 dark:border-white/10 flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-2xl lg:m-4 lg:mr-2 rounded-[2.5rem] lg:h-[calc(100vh-2rem)]`}>
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4 px-6'} h-24 border-b border-white/20 dark:border-white/5`}>
          <img src={logo} alt="Finonest India" className={`${collapsed ? 'h-10 w-10' : 'h-12 w-12'} object-contain drop-shadow-md`} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-gray-900 dark:text-white truncate tracking-tight">Finonest India</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 transition-all duration-300"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button className="lg:hidden ml-auto text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1 relative z-10">
          {filteredNav.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${collapsed ? 'justify-center px-3' : ''} ${active
                  ? 'bg-gradient-to-r from-secondary to-primary text-white shadow-lg shadow-primary/20 border border-white/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 border border-transparent'
                  }`}
              >
                <span className={`${active ? 'text-white drop-shadow-sm' : 'text-gray-400 group-hover:text-primary dark:group-hover:text-primary'} transition-colors duration-300`}>
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner border border-white/20">
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
            <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 dark:text-red-400 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-600 transition-all duration-300 w-full border border-red-200 dark:border-red-900/50 hover:border-transparent hover:shadow-lg hover:shadow-red-500/20">
              <LogOut size={18} />
              Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 lg:h-24 lg:mt-4 lg:mx-4 glass-panel border border-white/20 dark:border-white/5 rounded-2xl lg:rounded-[2rem] flex items-center px-4 lg:px-6 gap-3 lg:gap-6 shrink-0 shadow-sm z-40 lg:mb-2 bg-white/5 dark:bg-black/10 backdrop-blur-xl">
          {/* Mobile: Logo */}
          <div className="lg:hidden flex items-center">
            <img src={logo} alt="Finonest India" className="h-8 w-auto object-contain drop-shadow-md" />
          </div>

          {/* Page title / User greeting */}
          <div className="flex-1 min-w-0 flex items-center lg:ml-2 lg:border-l border-white/50 dark:border-white/10 lg:pl-6 h-10 lg:h-12">
            <div>
              <p className="text-sm lg:text-lg font-bold text-gray-900 dark:text-white truncate tracking-tight drop-shadow-sm">
                Hi, <span className="text-primary dark:text-primary">{user.name?.split(' ')[0] || 'User'}</span>
              </p>
              <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 font-medium truncate tracking-wide">
                {user.role ? ROLE_LABELS[user.role] : 'User'}
              </p>
            </div>
          </div>


          {/* Notification Bell */}
          <div className="glass-card rounded-xl p-1.5 lg:p-2 shadow-sm border border-white/40 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
            <NotificationBell />
          </div>

          {/* Profile Avatar */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-xs lg:text-sm shadow-md border border-white/20 hover:shadow-lg transition-all"
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
