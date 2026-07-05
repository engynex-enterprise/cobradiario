import Constants from 'expo-constants';
import { PostHogProvider } from 'posthog-react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as { posthogKey?: string; posthogHost?: string };
const KEY = extra.posthogKey;
const HOST = extra.posthogHost ?? 'https://us.i.posthog.com';

/**
 * Envuelve la app con PostHog (analítica de producto). Si no hay project key
 * configurada en app.json (extra.posthogKey), no instrumenta nada.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  if (!KEY) return <>{children}</>;
  return (
    <PostHogProvider apiKey={KEY} options={{ host: HOST }} autocapture>
      {children}
    </PostHogProvider>
  );
}
