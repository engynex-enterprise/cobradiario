'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokens } from '@/lib/api';
import { login as apiLogin, loginWithGoogle as apiLoginWithGoogle, type AuthUser } from '@/lib/graphql';
import { disconnectSocket } from '@/lib/socket';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (insforgeAccessToken: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = 'cd_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    if (raw && tokens.access) setUser(JSON.parse(raw));
    setLoading(false);
  }, []);

  // Si el refresh falla (sesión realmente expirada), cerrar sesión y volver al login.
  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem(USER_KEY);
      disconnectSocket();
      setUser(null);
      router.replace('/login');
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [router]);

  async function signIn(email: string, password: string) {
    const { login } = await apiLogin(email, password);
    tokens.set(login.accessToken, login.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(login.user));
    setUser(login.user);
    router.push('/dashboard');
  }

  async function signInWithGoogle(insforgeAccessToken: string) {
    const { loginWithGoogle } = await apiLoginWithGoogle(insforgeAccessToken);
    tokens.set(loginWithGoogle.accessToken, loginWithGoogle.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(loginWithGoogle.user));
    setUser(loginWithGoogle.user);
    router.push('/dashboard');
  }

  function signOut() {
    tokens.clear();
    localStorage.removeItem(USER_KEY);
    disconnectSocket();
    setUser(null);
    router.push('/login');
  }

  return <Ctx.Provider value={{ user, loading, signIn, signInWithGoogle, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
