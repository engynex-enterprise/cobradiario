import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; wsUrl?: string };
export const API_URL = extra.apiUrl ?? 'http://localhost:4000/graphql';
export const WS_URL = extra.wsUrl ?? 'http://localhost:4000';

const ACCESS_KEY = 'cd_access';
const REFRESH_KEY = 'cd_refresh';

// Cache en memoria para llamadas síncronas (los sockets necesitan el token al conectar).
let accessCache: string | null = null;

export const tokens = {
  get accessSync() {
    return accessCache;
  },
  async load(): Promise<string | null> {
    accessCache = await SecureStore.getItemAsync(ACCESS_KEY);
    return accessCache;
  },
  async set(access: string, refresh: string) {
    accessCache = access;
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  async clear() {
    accessCache = null;
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

export class GraphQLError extends Error {}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessCache ? { Authorization: `Bearer ${accessCache}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new GraphQLError(json.errors[0].message ?? 'Error de GraphQL');
  }
  return json.data as T;
}
