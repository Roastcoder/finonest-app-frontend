import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, api } from '@/lib/api';

export type UserRole = 'admin' | 'ops_team' | 'manager' | 'dsa' | 'team_leader' | 'executive';

export interface AppUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  status?: string;
  branch_id?: number;
}

interface AuthContextType {
  user: AppUser | null;
  session: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
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

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: string | null }> => {
    try {
      await authAPI.signup(fullName, email, password);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
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
