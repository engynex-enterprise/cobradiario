'use client';

import { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

/**
 * Pad de firma digital: dibuja con dedo/mouse y exporta un PNG (data URL).
 * Controlado por `value`/`onChange`. Si ya hay firma, se muestra como imagen
 * con opción de rehacer.
 */
export function SignaturePad({ value, onChange }: { value?: string; onChange: (dataUrl?: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [editing, setEditing] = useState(!value);

  useEffect(() => {
    if (!editing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Resolución nítida según ancho real.
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  }, [editing]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) onChange(canvasRef.current!.toDataURL('image/png'));
  }
  function clear() {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange(undefined);
  }

  if (!editing && value) {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border-2 border-border bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Firma" className="h-28 w-full object-contain" />
        </div>
        <button type="button" onClick={() => { onChange(undefined); setEditing(true); }} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          <PenLine className="h-4 w-4" /> Rehacer firma
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-32 w-full touch-none rounded-xl border-2 border-dashed border-border bg-white"
      />
      <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground">
        <Eraser className="h-4 w-4" /> Borrar
      </button>
    </div>
  );
}
