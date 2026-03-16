import { Link, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { LayoutDashboard, FileText, Car, Users, UserPlus, MoreHorizontal, Building2, UserCheck, MapPin, Settings, Wallet, Receipt, CreditCard, ShieldCheck, BarChart3, Sliders } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'manager', 'executive', 'team_leader', 'branch_manager', 'dsa'] },
  { label: 'Leads', path: '/leads-list', icon: <UserPlus size={20} />, roles: ['admin', 'manager', 'executive', 'team_leader', 'branch_manager', 'dsa'] },
  { label: 'Loans', path: '/loans', icon: <FileText size={20} />, roles: ['admin', 'manager', 'team_leader', 'branch_manager', 'dsa'] },
];

const MORE_ITEMS: NavItem[] = [
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={18} />, roles: ['admin', 'manager', 'branch_manager', 'dsa'] },
  { label: 'Users', path: '/users', icon: <Users size={18} />, roles: ['admin', 'manager'] },
  { label: 'Banks / NBFC', path: '/banks', icon: <Building2 size={18} />, roles: ['admin'] },
  { label: 'Brokers / DSA', path: '/brokers', icon: <UserCheck size={18} />, roles: ['admin'] },
  { label: 'Branches', path: '/branches', icon: <MapPin size={18} />, roles: ['admin', 'manager'] },
  { label: 'RC Limits', path: '/rc-limits', icon: <Wallet size={18} />, roles: ['admin', 'manager', 'branch_manager', 'dsa'] },
  { label: 'Payouts', path: '/payouts', icon: <Receipt size={18} />, roles: ['admin', 'manager', 'branch_manager', 'dsa'] },
  { label: 'Expenses', path: '/expenses', icon: <CreditCard size={18} />, roles: ['admin', 'manager', 'branch_manager', 'dsa'] },
  { label: 'Insurance', path: '/insurance', icon: <ShieldCheck size={18} />, roles: ['admin', 'manager', 'branch_manager'] },
  { label: 'Permissions', path: '/permissions', icon: <Settings size={18} />, roles: ['admin'] },
  { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={18} />, roles: ['admin'] },
  { label: 'System Config', path: '/settings', icon: <Sliders size={18} />, roles: ['admin'] },
];

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const filteredNav = MOBILE_NAV_ITEMS.filter(item => !user.role || item.roles.includes(user.role));
  const filteredMore = MORE_ITEMS.filter(item => !user.role || item.roles.includes(user.role));

  return (
    <nav className="lg:hidden fixed bottom-4 left-4 right-4 glass-panel border border-white/20 dark:border-white/5 rounded-2xl shadow-xl z-40 backdrop-blur-xl bg-white/5 dark:bg-black/10">
      <div className="flex items-center justify-around px-2 py-3">
        {filteredNav.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 min-w-0 flex-1 ${active
                ? 'bg-gradient-to-r from-secondary to-primary text-white shadow-lg shadow-primary/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                }`}
            >
              <span className={`transition-transform ${active ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className="text-[10px] font-semibold truncate w-full text-center tracking-wide">{item.label}</span>
            </Link>
          );
        })}
        
        {filteredMore.length > 0 && <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 min-w-0 flex-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5">
              <MoreHorizontal size={20} />
              <span className="text-[10px] font-semibold truncate w-full text-center tracking-wide">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-2 overflow-y-auto h-[calc(70vh-80px)]">
              {filteredMore.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                      ? 'bg-gradient-to-r from-secondary to-primary text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>}
      </div>
    </nav>
  );
}
