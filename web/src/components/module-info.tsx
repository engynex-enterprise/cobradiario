'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Info, Target, ListChecks, Code2, Lightbulb, Sparkles } from 'lucide-react';

export interface ModuleInfo {
  /** Título del drawer. Por defecto: "<módulo> · Guía". */
  title?: string;
  /** Qué es el módulo (una o dos frases). */
  summary: string;
  /** Para qué sirve. */
  purpose: string;
  /** Cómo funciona, paso a paso. */
  how: string[];
  /** Ejemplo técnico (cálculos, campos, flujo interno). */
  technical?: string;
  /** Ejemplo cotidiano, sin tecnicismos. */
  plain?: string;
  /** Consejos u observaciones. */
  tips?: string[];
}

/** Botón de información (ícono) que abre un drawer explicando el módulo. */
export function ModuleInfoButton({ info, moduleTitle }: { info: ModuleInfo; moduleTitle: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="¿Qué es este módulo?"
        aria-label="Información del módulo"
        className="flex size-10 items-center justify-center rounded-2xl border-2 border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
      >
        <Info className="size-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full max-w-lg gap-0 p-0">
          <div className="border-b-2 border-border bg-primary/5 p-6">
            <SheetHeader>
              <div className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Sparkles className="size-6" />
              </div>
              <SheetTitle>{info.title ?? `${moduleTitle} · Guía`}</SheetTitle>
              <SheetDescription>{info.summary}</SheetDescription>
            </SheetHeader>
          </div>

          <div className="space-y-6 p-6">
            <Section icon={<Target className="size-4" />} title="Para qué sirve">
              <p className="text-sm leading-relaxed text-foreground/80">{info.purpose}</p>
            </Section>

            <Section icon={<ListChecks className="size-4" />} title="Cómo funciona">
              <ol className="space-y-2">
                {info.how.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground/80">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Section>

            {info.technical && (
              <Section icon={<Code2 className="size-4" />} title="Ejemplo técnico">
                <div className="rounded-xl border-2 border-border bg-muted/50 p-3 text-sm leading-relaxed text-foreground/80">
                  {info.technical}
                </div>
              </Section>
            )}

            {info.plain && (
              <Section icon={<Lightbulb className="size-4" />} title="Ejemplo cotidiano">
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {info.plain}
                </div>
              </Section>
            )}

            {info.tips && info.tips.length > 0 && (
              <Section icon={<Sparkles className="size-4" />} title="Consejos">
                <ul className="space-y-1.5">
                  {info.tips.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/80">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
