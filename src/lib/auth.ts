// Role labels (used across the app)
export type UserRole = 'admin' | 'ops_team' | 'manager' | 'dsa' | 'team_leader' | 'executive' | 'accountant';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin (L1)',
  ops_team: 'Operational Team (L2)',
  manager: 'Sales Team (L3)',
  dsa: 'DSA (L4)',
  team_leader: 'Team Leader (L5)',
  executive: 'Executive (L6)',
  accountant: 'Accountant'
};

// Demo accounts for quick login (these exist in the real auth system)
export const DEMO_ACCOUNTS = [
  { name: 'Priya Sharma', email: 'admin@finonest.com', role: 'admin' as UserRole, password: 'Demo@1234' },
  { name: 'Kavita Iyer', email: 'ops@finonest.com', role: 'ops_team' as UserRole, password: 'Demo@1234' },
  { name: 'Amit Patel', email: 'manager@finonest.com', role: 'manager' as UserRole, password: 'Demo@1234' },
  { name: 'Vikram Singh', email: 'dsa@finonest.com', role: 'dsa' as UserRole, password: 'Demo@1234' },
  { name: 'Sneha Jain', email: 'tl@finonest.com', role: 'team_leader' as UserRole, password: 'Demo@1234' },
  { name: 'Neha Gupta', email: 'executive@finonest.com', role: 'executive' as UserRole, password: 'Demo@1234' },
];
