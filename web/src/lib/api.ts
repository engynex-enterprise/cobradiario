/**
 * Cliente GraphQL mínimo (fetch) + gestión de tokens con refresh automático.
 * Al recibir un error de autenticación se intenta refrescar el token (rotado en el backend)
 * una sola vez —de forma single-flight— y se reintenta la petición original.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

const ACCESS_KEY = 'cd_access';
const REFRESH_KEY = 'cd_refresh';

export const tokens = {
  get access() {
    return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class GraphQLError extends Error {}

interface GqlJson<T> {
  data?: T;
  errors?: { message: string; code?: string }[];
}

function isAuthError(errors?: { message: string; code?: string }[]): boolean {
  return !!errors?.some(
    (e) => e.code === 'UNAUTHENTICATED' || /unauthorized/i.test(e.message),
  );
}

async function rawGql<T>(query: string, variables?: Record<string, unknown>): Promise<GqlJson<T>> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// --- Refresh single-flight: varias peticiones que fallan a la vez comparten un solo refresh ---
let refreshing: Promise<boolean> | null = null;

const REFRESH_MUTATION = `mutation($t: String!) {
  refreshToken(input: { refreshToken: $t }) { accessToken refreshToken }
}`;

async function doRefresh(): Promise<boolean> {
  const rt = tokens.refresh;
  if (!rt) return false;
  const json = await rawGql<{ refreshToken: { accessToken: string; refreshToken: string } }>(
    REFRESH_MUTATION,
    { t: rt },
  );
  if (json.errors || !json.data?.refreshToken) {
    tokens.clear();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'));
    return false;
  }
  tokens.set(json.data.refreshToken.accessToken, json.data.refreshToken.refreshToken);
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

  // Token expirado → refrescar una vez y reintentar (salvo que sea el propio refresh).
  if (isAuthError(json.errors) && tokens.refresh && !query.includes('refreshToken(')) {
    const ok = await refreshOnce();
    if (ok) json = await rawGql<T>(query, variables);
  }

  if (json.errors?.length) {
    throw new GraphQLError(json.errors[0].message ?? 'Error de GraphQL');
  }
  return json.data as T;
}
