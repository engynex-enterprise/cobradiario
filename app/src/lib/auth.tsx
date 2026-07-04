import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens } from './api';
import { login as apiLogin, type AuthUser } from './graphql';
import { disconnectSocket } from './socket';

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = 'cd_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const access = await tokens.load();
      const raw = await AsyncStorage.getItem(USER_KEY);
      if (access && raw) setUser(JSON.parse(raw) as AuthUser);
      setReady(true);
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const { login } = await apiLogin(email, password);
    await tokens.set(login.accessToken, login.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(login.user));
    setUser(login.user);
  }

  async function signOut() {
    await tokens.clear();
    await AsyncStorage.removeItem(USER_KEY);
    disconnectSocket();
    setUser(null);
  }

  return <Ctx.Provider value={{ user, ready, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
