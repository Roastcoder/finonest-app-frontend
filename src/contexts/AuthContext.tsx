import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, api } from '@/lib/api';

export type UserRole = 'admin' | 'ops_team' | 'manager' | 'sales_manager' | 'dsa' | 'team_leader' | 'executive' | 'accountant';

export interface AppUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  status?: string;
  branch_id?: number;
  reporting_to?: number;
  manager_name?: string;
  manager_role?: string;
  refer_code?: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  signUp: (userData: any) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      api.setToken(token);
      authAPI.getProfile()
        .then((userData) => {
          setUser(userData);
          setSession({ user: userData });
        })
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const data = await authAPI.login(email, password);
      if (data.token) {
        api.setToken(data.token);
        setUser(data.user);
        setSession({ user: data.user });
      }
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signUp = async (userData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      await authAPI.signup(userData.name, userData.email, userData.password, {
        role: userData.role,
        refer_code: userData.refer_code,
        pan_number: userData.pan_number,
        aadhaar_number: userData.aadhaar_number,
        pan_data: userData.pan_data,
        aadhaar_data: userData.aadhaar_data
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    api.setToken(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, logout, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
