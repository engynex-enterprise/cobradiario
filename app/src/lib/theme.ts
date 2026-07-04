// Tema Duolingo (igual que la web): verde brillante, esquinas 16px, botones 3D.
export const colors = {
  primary: '#58cc02',
  primaryDark: '#46a302', // base inferior 3D del botón
  onPrimary: '#ffffff',
  bg: '#f7f7f7',
  card: '#ffffff',
  text: '#3c3c3c',
  muted: '#777777',
  border: '#e5e5e5',
  accent: '#ddf4ff',
  accentText: '#1899d6',
  success: '#58cc02',
  danger: '#ff4b4b',
  dangerDark: '#ea2b2b',
  disabled: '#e5e5e5',
};

export const radius = 16;

export function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}
