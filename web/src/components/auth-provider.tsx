'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { tokens } from '@/lib/api';
import { login as apiLogin, loginWithGoogle as apiLoginWithGoogle, register as apiRegister, acceptInvitation as apiAcceptInvitation, fetchMyPermissions, type AuthUser } from '@/lib/graphql';
import { disconnectSocket } from '@/lib/socket';

function identify(u: AuthUser) {
  if (posthog.__loaded) posthog.identify(u.id, { email: u.email, name: u.fullName, role: u.role, tenantId: u.tenantId });
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  permissions: string[];
  can: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (insforgeAccessToken: string) => Promise<void>;
  signUp: (input: { tenantName: string; fullName: string; email: string; password: string; phone?: string }) => Promise<{ email: string; message: string }>;
  acceptInvite: (input: { token: string; fullName: string; password: string }) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = 'cd_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadPermissions = () => {
    fetchMyPermissions().then((d) => setPermissions(d.myPermissions)).catch(() => setPermissions([]));
  };
  // OWNER es superusuario; el resto se rige por sus permisos efectivos.
  const can = (permission: string) => user?.role === 'OWNER' || permissions.includes(permission);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    if (raw && tokens.access) { const u = JSON.parse(raw) as AuthUser; setUser(u); identify(u); loadPermissions(); }
    setLoading(false);
  }, []);

  // Si el refresh falla (sesión realmente expirada), cerrar sesión y volver al login.
  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem(USER_KEY);
      disconnectSocket();
      setUser(null);
      setPermissions([]);
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
    identify(login.user);
    loadPermissions();
    router.push('/dashboard');
  }

  async function signInWithGoogle(insforgeAccessToken: string) {
    const { loginWithGoogle } = await apiLoginWithGoogle(insforgeAccessToken);
    tokens.set(loginWithGoogle.accessToken, loginWithGoogle.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(loginWithGoogle.user));
    setUser(loginWithGoogle.user);
    identify(loginWithGoogle.user);
    loadPermissions();
    router.push('/dashboard');
  }

  async function signUp(input: { tenantName: string; fullName: string; email: string; password: string; phone?: string }) {
    const { register } = await apiRegister(input);
    // No inicia sesión: la cuenta requiere confirmación por correo.
    return { email: register.email, message: register.message };
  }

  async function acceptInvite(input: { token: string; fullName: string; password: string }) {
    const { acceptInvitation } = await apiAcceptInvitation(input);
    tokens.set(acceptInvitation.accessToken, acceptInvitation.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(acceptInvitation.user));
    setUser(acceptInvitation.user);
    identify(acceptInvitation.user);
    loadPermissions();
    router.push('/dashboard');
  }

  function signOut() {
    tokens.clear();
    localStorage.removeItem(USER_KEY);
    disconnectSocket();
    if (posthog.__loaded) posthog.reset();
    setUser(null);
    setPermissions([]);
    router.push('/login');
  }

  return <Ctx.Provider value={{ user, loading, permissions, can, signIn, signInWithGoogle, signUp, acceptInvite, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
