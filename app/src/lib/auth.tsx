import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens, setOnAuthExpired } from './api';
import { login as apiLogin, fetchMyPermissions, type AuthUser } from './graphql';
import { disconnectSocket } from './socket';

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean;
  permissions: string[];
  can: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = 'cd_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const loadPermissions = () => {
    fetchMyPermissions().then((d) => setPermissions(d.myPermissions)).catch(() => setPermissions([]));
  };
  // OWNER es superusuario; el resto se rige por sus permisos efectivos.
  const can = (permission: string) => user?.role === 'OWNER' || permissions.includes(permission);

  useEffect(() => {
    (async () => {
      const access = await tokens.load();
      const raw = await AsyncStorage.getItem(USER_KEY);
      if (access && raw) { setUser(JSON.parse(raw) as AuthUser); loadPermissions(); }
      setReady(true);
    })();

    // Si el refresh falla (sesión expirada de verdad), cerrar sesión.
    setOnAuthExpired(() => {
      AsyncStorage.removeItem(USER_KEY);
      disconnectSocket();
      setUser(null);
      setPermissions([]);
    });
    return () => setOnAuthExpired(null);
  }, []);

  async function signIn(email: string, password: string) {
    const { login } = await apiLogin(email, password);
    await tokens.set(login.accessToken, login.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(login.user));
    setUser(login.user);
    loadPermissions();
  }

  async function signOut() {
    await tokens.clear();
    await AsyncStorage.removeItem(USER_KEY);
    disconnectSocket();
    setUser(null);
    setPermissions([]);
  }

  async function updateUser(patch: Partial<AuthUser>) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(USER_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  return <Ctx.Provider value={{ user, ready, permissions, can, signIn, signOut, updateUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
