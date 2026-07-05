'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { insforge } from '@/lib/insforge';
import { Loader2 } from 'lucide-react';

/**
 * Retorno del OAuth de Google (InsForge). El SDK ya canjeó el `insforge_code`
 * al cargar; aquí tomamos su accessToken y lo intercambiamos por nuestros JWT
 * vía el backend (signInWithGoogle), luego redirigimos al panel.
 */
export default function GoogleCallbackPage() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        // Espera a que el SDK rehidrate/canjee la sesión (auto tras el redirect).
        const { data } = await insforge.auth.getCurrentUser();
        // getAccessToken existe en runtime; el tipo público no lo expone.
        const token = (insforge.auth as unknown as { getAccessToken(): string | null }).getAccessToken();
        if (!data?.user || !token) throw new Error('No se recibió la sesión de Google');
        await signInWithGoogle(token); // emite nuestros tokens y redirige a /dashboard
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión con Google');
      }
    })();
  }, [signInWithGoogle]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      {error ? (
        <>
          <p className="text-lg font-extrabold">No se pudo ingresar</p>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <Link href="/login" className="font-bold text-primary hover:underline">Volver al inicio de sesión</Link>
        </>
      ) : (
        <>
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Ingresando con Google…</p>
        </>
      )}
    </div>
  );
}
