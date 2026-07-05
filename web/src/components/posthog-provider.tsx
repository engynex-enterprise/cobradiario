'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

/**
 * Inicializa PostHog en el cliente. La project API key (phc_...) es pública y va
 * en el bundle; se configura vía NEXT_PUBLIC_POSTHOG_KEY. Si no está definida,
 * PostHog queda inerte (útil en local sin analítica).
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: 'identified_only',
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
