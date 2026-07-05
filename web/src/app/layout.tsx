import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { PostHogProvider } from '@/components/posthog-provider';
import { Toaster } from 'sonner';

// Tipografía redonda del tema Duolingo (igual que la variante .pos-duo de orus-pos).
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Cobro Diario — Panel',
  description: 'Plataforma de gestión de cobro diario',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={nunito.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <PostHogProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
