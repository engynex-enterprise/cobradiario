import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; wsUrl?: string };
export const API_URL = extra.apiUrl ?? 'http://localhost:4000/graphql';
export const WS_URL = extra.wsUrl ?? 'http://localhost:4000';

const ACCESS_KEY = 'cd_access';
const REFRESH_KEY = 'cd_refresh';

// Cache en memoria (los sockets y el interceptor necesitan el token de forma síncrona).
let accessCache: string | null = null;
let refreshCache: string | null = null;

// Callback invocado cuando la sesión expira de verdad (refresh falló).
let onAuthExpired: (() => void) | null = null;
export function setOnAuthExpired(cb: (() => void) | null) {
  onAuthExpired = cb;
}

export const tokens = {
  get accessSync() {
    return accessCache;
  },
  async load(): Promise<string | null> {
    accessCache = await SecureStore.getItemAsync(ACCESS_KEY);
    refreshCache = await SecureStore.getItemAsync(REFRESH_KEY);
    return accessCache;
  },
  async set(access: string, refresh: string) {
    accessCache = access;
    refreshCache = refresh;
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  async clear() {
    accessCache = null;
    refreshCache = null;
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

export class GraphQLError extends Error {}

interface GqlJson<T> {
  data?: T;
  errors?: { message: string; code?: string }[];
}

function isAuthError(errors?: { message: string; code?: string }[]): boolean {
  return !!errors?.some((e) => e.code === 'UNAUTHENTICATED' || /unauthorized/i.test(e.message));
}

async function rawGql<T>(query: string, variables?: Record<string, unknown>): Promise<GqlJson<T>> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessCache ? { Authorization: `Bearer ${accessCache}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const REFRESH_MUTATION = `mutation($t: String!) {
  refreshToken(input: { refreshToken: $t }) { accessToken refreshToken }
}`;

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!refreshCache) return false;
  const json = await rawGql<{ refreshToken: { accessToken: string; refreshToken: string } }>(
    REFRESH_MUTATION,
    { t: refreshCache },
  );
  if (json.errors || !json.data?.refreshToken) {
    await tokens.clear();
    onAuthExpired?.();
    return false;
  }
  await tokens.set(json.data.refreshToken.accessToken, json.data.refreshToken.refreshToken);
  return true;
}

function refreshOnce(): Promise<boolean> {
  if (!refreshing) refreshing = doRefresh().finally(() => (refreshing = null));
  return refreshing;
}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let json = await rawGql<T>(query, variables);

  if (isAuthError(json.errors) && refreshCache && !query.includes('refreshToken(')) {
    const ok = await refreshOnce();
    if (ok) json = await rawGql<T>(query, variables);
  }

  if (json.errors?.length) {
    throw new GraphQLError(json.errors[0].message ?? 'Error de GraphQL');
  }
  return json.data as T;
}
