// Role labels (used across the app)
export type UserRole = 'admin' | 'sales_manager' | 'branch_manager' | 'dsa' | 'team_leader' | 'executive';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  sales_manager: 'Sales Manager',
  branch_manager: 'Branch Manager',
  dsa: 'DSA',
  team_leader: 'Team Leader',
  executive: 'Executive'
};

// Demo accounts for quick login (these exist in the real auth system)
export const DEMO_ACCOUNTS = [
  { name: 'Priya Sharma', email: 'admin@finonest.com', role: 'admin' as UserRole, password: 'Demo@1234' },
  { name: 'Rajesh Kumar', email: 'sales@finonest.com', role: 'sales_manager' as UserRole, password: 'Demo@1234' },
  { name: 'Priya Singh', email: 'bm@finonest.com', role: 'branch_manager' as UserRole, password: 'Demo@1234' },
  { name: 'Amit Patel', email: 'dsa@finonest.com', role: 'dsa' as UserRole, password: 'Demo@1234' },
  { name: 'Neha Sharma', email: 'tl@finonest.com', role: 'team_leader' as UserRole, password: 'Demo@1234' },
  { name: 'Ananya Gupta', email: 'executive@finonest.com', role: 'executive' as UserRole, password: 'Demo@1234' },
];
