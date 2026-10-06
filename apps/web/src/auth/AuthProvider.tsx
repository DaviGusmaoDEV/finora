import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';

export type Preference = {
  currency: string;
  locale: string;
  timezone: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  dateFormat: string;
  onboardingCompleted: boolean;
};
export type AuthUser = { id: string; name: string; email: string; preference: Preference | null };
type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try {
      const result = await apiFetch<{ user: AuthUser }>('/auth/me');
      setUser(result.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      login: async (email, password) => {
        const result = await apiFetch<{ user: AuthUser }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setUser(result.user);
      },
      register: async (name, email, password) => {
        const result = await apiFetch<{ user: AuthUser }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        setUser(result.user);
      },
      logout: async () => {
        await apiFetch('/auth/logout', { method: 'POST' });
        setUser(null);
      },
    }),
    [loading, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
}
