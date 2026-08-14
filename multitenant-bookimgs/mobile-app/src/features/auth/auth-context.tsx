import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { deleteAccount as apiDeleteAccount, getMe, login as apiLogin, type CurrentUser } from '@/features/auth/api';
import { register as apiRegister } from '@/features/onboarding/api';
import { RegisterInput } from '@/features/onboarding/types';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '@/lib/storage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getStoredAuth();
      if (!stored) {
        setStatus('unauthenticated');
        return;
      }
      // Never trust a stored token blindly — verify it's still valid first.
      try {
        const me = await getMe();
        setUser(me);
        setStatus('authenticated');
      } catch {
        await clearStoredAuth();
        setStatus('unauthenticated');
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (email: string, password: string) => {
        const res = await apiLogin(email, password);
        await setStoredAuth({ token: res.token, subdomain: res.subdomain });
        setUser(res.user);
        setStatus('authenticated');
      },
      register: async (data: RegisterInput) => {
        const res = await apiRegister(data);
        await setStoredAuth({ token: res.token, subdomain: res.subdomain });
        setUser(res.user);
        setStatus('authenticated');
      },
      logout: async () => {
        await clearStoredAuth();
        setUser(null);
        setStatus('unauthenticated');
      },
      deleteAccount: async () => {
        await apiDeleteAccount();
        await clearStoredAuth();
        setUser(null);
        setStatus('unauthenticated');
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
