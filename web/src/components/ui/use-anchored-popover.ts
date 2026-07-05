'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Posiciona un popover en un portal (fixed, relativo al viewport) anclado a un
 * trigger, volteándose arriba/abajo y ajustándose a izquierda/derecha para no
 * salirse de la pantalla ni ser recortado por contenedores con overflow.
 */
export function useAnchoredPopover() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });

  const reposition = () => {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const c = contentRef.current?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ch = c?.height || 300;
    const cw = Math.max(c?.width || 0, t.width);
    const s: CSSProperties = { position: 'fixed', minWidth: t.width, visibility: 'visible' };
    // Vertical: abajo por defecto; arriba si no cabe y arriba hay más espacio.
    if (vh - t.bottom < ch + 8 && t.top > vh - t.bottom) s.bottom = Math.round(vh - t.top + 6);
    else s.top = Math.round(Math.min(t.bottom + 6, vh - ch - 8));
    // Horizontal: alinea a la izquierda del trigger y ajusta si se sale.
    let left = t.left;
    if (left + cw > vw - 8) left = Math.max(8, vw - 8 - cw);
    s.left = Math.round(Math.max(8, left));
    setStyle(s);
  };

  useLayoutEffect(() => {
    if (!open) { setStyle({ position: 'fixed', visibility: 'hidden' }); return; }
    reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !contentRef.current?.contains(target)) setOpen(false);
    };
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, triggerRef, contentRef, style, reposition };
}

/**
 * Contenedor para el portal del popover: el diálogo/drawer más cercano si el
 * trigger está dentro de uno (respeta el focus-trap y evita cerrar el Sheet),
 * o el body en otro caso. Se posiciona con `fixed`, así que el overflow no lo recorta.
 */
export function getPopoverContainer(trigger: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return (trigger?.closest('[role="dialog"]') as HTMLElement) ?? document.body;
}
