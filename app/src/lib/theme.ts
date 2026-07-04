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
  // Verde salvia para cabeceras de detalle (cliente/crédito)
  sage: '#3f7d63',
  sageDark: '#2f6b52',
  sageSoft: '#e3f0e9',
  sageText: '#3f7d63',
  warn: '#f59e0b',
  warnSoft: '#fef3c7',
};

export const radius = 16;

export function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}
