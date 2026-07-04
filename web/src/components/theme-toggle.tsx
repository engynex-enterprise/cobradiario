'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, MoonStar, Sun } from 'lucide-react';

const ORDER = ['light', 'dark', 'night'] as const;
const NEXT: Record<string, string> = { light: 'dark', dark: 'night', night: 'light' };
const LABEL: Record<string, string> = { light: 'Modo claro', dark: 'Modo oscuro', night: 'Modo noche' };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted && theme && ORDER.includes(theme as (typeof ORDER)[number]) ? theme : 'light';
  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[current])}
      title={`${LABEL[current]} · cambiar`}
      className="flex size-11 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {current === 'light' ? <Sun className="size-5" /> : current === 'dark' ? <Moon className="size-5" /> : <MoonStar className="size-5" />}
    </button>
  );
}
