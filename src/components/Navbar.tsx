import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/auth';
import { Download, LogOut, Eye, Share2, UserCircle } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useDashboardContextSafe } from '@/pages/Dashboard';

interface NavbarProps {
  title?: string;
  showTimeline?: boolean;
  showExport?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
}

export default function Navbar({
  title,
  showTimeline = true,
  showExport = true,
  showNotifications = true,
  showProfile = true
}: NavbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const dashboardContext = useDashboardContextSafe();

  // Listen to sidebar collapse state from localStorage or context
  React.useEffect(() => {
    const checkSidebarState = () => {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      setSidebarCollapsed(collapsed);
    };
    checkSidebarState();
    window.addEventListener('storage', checkSidebarState);
    return () => window.removeEventListener('storage', checkSidebarState);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="fixed top-0 left-0 right-0 h-14 lg:h-[clamp(3rem,5vh,3.5rem)] border-b border-white/20 dark:border-white/5 flex items-center px-3 lg:px-5 gap-2 lg:gap-4 shrink-0 shadow-sm z-[110] bg-white dark:bg-gray-900 backdrop-blur-sm transition-all lg:left-[clamp(11rem,15vw,11rem)]" style={{
      left: window.innerWidth >= 1024 && sidebarCollapsed ? 'clamp(3.5rem, 5vw, 3.5rem)' : undefined
    }}>
      {/* Logo - Mobile Only */}
      <div className="lg:hidden flex items-center gap-3">
        <img src="/Finonest%20logo.png" alt="Finonest India" className="h-8 w-auto object-contain drop-shadow-md" />
      </div>

      {/* Page Title */}
      <div className="flex-1 min-w-0 flex items-center">
        {title && (
          <h1 className="text-sm lg:text-base font-bold text-foreground truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Timeline & Export Buttons - Only on Dashboard */}
      {isDashboard && dashboardContext && showTimeline && showExport && (
        <div className="hidden lg:flex items-center gap-2">
          {/* Timeline Selector */}
          <select
            value={dashboardContext.timeline}
            onChange={(e) => dashboardContext.setTimeline(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200/50 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md transition-all cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom</option>
          </select>

          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="p-1.5 rounded-lg bg-white/80 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-primary hover:shadow-md transition-all"
              title="Export Dashboard"
            >
              <Download size={16} />
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-10 w-48 glass-panel border border-white/20 dark:border-white/5 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      dashboardContext.setIsGeneratingPDF(true);
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all border-b border-white/10"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                  <button
                    onClick={() => {
                      dashboardContext.handleViewDashboard?.();
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all border-b border-white/10"
                  >
                    <Eye size={14} />
                    View PDF
                  </button>
                  <button
                    onClick={() => {
                      dashboardContext.handleShareDashboard?.();
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                  >
                    <Share2 size={14} />
                    Share PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notification Bell */}
      {showNotifications && (
        <div className="bg-white/80 dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200/50 dark:border-gray-700 hover:shadow-md transition-colors cursor-pointer group">
          <div className="text-gray-600 group-hover:text-primary transition-colors">
            <NotificationBell />
          </div>
        </div>
      )}

      {/* Profile Avatar */}
      {showProfile && (
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-primary font-bold text-xs shadow-sm border border-gray-200/50 dark:border-gray-700 hover:shadow-md transition-all"
          >
            {initials}
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-12 lg:top-14 w-56 glass-panel border border-white/20 dark:border-white/5 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all backdrop-blur-2xl bg-white/10 dark:bg-black/20">
                <div className="p-4 border-b border-white/10">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">User Account</p>
                  <p className="text-xs font-semibold text-primary dark:text-primary">{user.role ? ROLE_LABELS[user.role as UserRole] : 'No role'}</p>
                  {user.role === 'executive' && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Team: {user.manager_name || 'No team leader assigned'}
                    </p>
                  )}
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl transition-all"
                  >
                    <UserCircle size={18} />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setProfileOpen(false);
                    }}
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
      )}
    </header>
  );
}
