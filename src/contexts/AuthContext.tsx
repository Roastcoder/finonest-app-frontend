import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, api } from '@/lib/api';

export type UserRole = 'admin' | 'ops_team' | 'manager' | 'sales_manager' | 'dsa' | 'team_leader' | 'executive' | 'accountant' | 'branch_manager';

export interface AppUser {
  id: number;
  phone: string;
  name: string;
  role: UserRole;
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
  login: (phone: string, password: string) => Promise<{ error: string | null }>;
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

  const login = async (phone: string, password: string): Promise<{ error: string | null }> => {
    try {
      const data = await api.post('/auth/login', { phone, password });
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
      const signupData = {
        name: userData.name,
        phone: userData.phone,
        password: userData.mpin,
        role: userData.role,
        refer_code: userData.refer_code,
        pan_number: userData.pan_number,
        aadhaar_number: userData.aadhaar_number,
        pan_data: userData.pan_data,
        aadhaar_data: userData.aadhaar_data,
        photo_path: userData.photo_path
      };
      
      await api.post('/auth/signup', signupData);
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
