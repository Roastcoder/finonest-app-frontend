import { Link, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { LayoutDashboard, FileText, Car, Users, UserPlus, MoreHorizontal, Building2, UserCheck, MapPin, Settings, Wallet, Receipt, CreditCard, ShieldCheck, BarChart3, Sliders, Copy, Share2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'manager', 'sales_manager', 'executive', 'team_leader', 'branch_manager', 'dsa'] },
  { label: 'Leads', path: '/leads-list', icon: <UserPlus size={18} />, roles: ['admin', 'manager', 'sales_manager', 'executive', 'team_leader', 'branch_manager', 'dsa'] },
  { label: 'Loans', path: '/loans', icon: <FileText size={18} />, roles: ['admin', 'manager', 'sales_manager', 'team_leader', 'branch_manager', 'dsa'] },
  { label: 'Team', path: '/team', icon: <Users size={18} />, roles: ['manager', 'sales_manager', 'team_leader', 'dsa', 'branch_manager'] },
];

const MORE_ITEMS: NavItem[] = [
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
  { label: 'Users', path: '/users', icon: <Users size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
  { label: 'Banks / NBFC', path: '/banks', icon: <Building2 size={16} />, roles: ['admin'] },
  { label: 'Brokers / DSA', path: '/brokers', icon: <UserCheck size={16} />, roles: ['admin'] },
  { label: 'Branches', path: '/branches', icon: <MapPin size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
  { label: 'Find My Lender', path: '/find-lender', icon: <MapPin size={16} />, roles: ['admin'] },
  { label: 'RC Limits', path: '/rc-limits', icon: <Wallet size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
  { label: 'Payouts', path: '/payouts', icon: <Receipt size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
  { label: 'Expenses', path: '/expenses', icon: <CreditCard size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
  { label: 'Insurance', path: '/insurance', icon: <ShieldCheck size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager'] },
  { label: 'Permissions', path: '/permissions', icon: <Settings size={16} />, roles: ['admin'] },
  { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={16} />, roles: ['admin'] },
  { label: 'System Config', path: '/settings', icon: <Sliders size={16} />, roles: ['admin'] },
];

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const handleCopyReferCode = () => {
    if (user.refer_code) {
      navigator.clipboard.writeText(user.refer_code);
      toast.success('Refer code copied!');
    }
  };

  const handleShareReferCode = () => {
    if (user.refer_code) {
      const message = `Join Finonest with my refer code: ${user.refer_code}`;
      if (navigator.share) {
        navigator.share({
          title: 'Finonest Refer Code',
          text: message
        });
      } else {
        navigator.clipboard.writeText(message);
        toast.success('Refer message copied!');
      }
    }
  };

  const filteredNav = MOBILE_NAV_ITEMS.filter(item => !user.role || item.roles.includes(user.role));
  const filteredMore = MORE_ITEMS.filter(item => !user.role || item.roles.includes(user.role));

  return (
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 bg-white dark:bg-gray-900/95 border border-border/50 rounded-xl shadow-lg z-40 backdrop-blur-sm">
      <div className="flex items-center justify-around px-1 py-2">
        {filteredNav.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-300 flex-1 ${active
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/10'
                }`}
            >
              <span className={`transition-transform ${active ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className="text-[9px] font-bold truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
        
        {filteredMore.length > 0 && <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-300 flex-1 text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/10">
              <MoreHorizontal size={18} />
              <span className="text-[9px] font-bold truncate w-full text-center">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-base">More Options</SheetTitle>
            </SheetHeader>
            
            {/* Refer Code Section for Mobile */}
            {['team_leader', 'branch_manager', 'dsa'].includes(user.role) && user.refer_code && (
              <div className="mt-3 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Refer Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono font-bold text-primary bg-white/80 dark:bg-gray-800/80 px-3 py-2 rounded-lg border border-primary/20">
                    {user.refer_code}
                  </code>
                  <button
                    onClick={handleCopyReferCode}
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    title="Copy"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={handleShareReferCode}
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    title="Share"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-4 space-y-1 overflow-y-auto h-[calc(60vh-120px)]">
              {filteredMore.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${active
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-primary/10'
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
