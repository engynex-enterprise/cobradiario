'use client';

import { createClient } from '@insforge/sdk';

/**
 * Cliente InsForge para el navegador (SPA). Solo se usa para el OAuth de Google
 * en la arquitectura híbrida: tras autenticar, tomamos el accessToken y lo
 * canjeamos en nuestro backend NestJS (mutación loginWithGoogle).
 */
export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? '',
});

export const GOOGLE_ENABLED = !!process.env.NEXT_PUBLIC_INSFORGE_URL;
