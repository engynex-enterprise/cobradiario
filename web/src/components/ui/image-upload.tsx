'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Reduce la imagen a un data URL JPEG (máx `maxDim` px) para no inflar la BD. */
function fileToCompressedDataUrl(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo procesar la imagen'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value?: string;
  onChange: (dataUrl?: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      onChange(await fileToCompressedDataUrl(file));
    } catch {
      // silencioso; el usuario puede reintentar
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      {value ? (
        <div className="relative overflow-hidden rounded-xl border-2 border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-32 w-full object-cover" />
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white hover:bg-black/80">
              Cambiar
            </button>
            <button type="button" onClick={() => onChange(undefined)} className="flex size-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className={cn(
            'flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent',
          )}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
          <span className="text-xs font-semibold">{loading ? 'Procesando…' : 'Tomar / subir foto'}</span>
          {hint && <span className="px-3 text-center text-[10px] text-muted-foreground">{hint}</span>}
        </button>
      )}
    </div>
  );
}
