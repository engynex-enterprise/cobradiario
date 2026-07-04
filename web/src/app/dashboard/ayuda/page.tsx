'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle, BookOpen, Mail } from 'lucide-react';

const FAQS = [
  { q: '¿Cómo registro un préstamo?', a: 'Ve a Cartera → Préstamos → Nuevo crédito. Define monto, cuotas, interés, mora y cargos; el plan de cuotas se genera automáticamente.' },
  { q: '¿Cómo registro un abono?', a: 'Abre el crédito y usa el botón Abonar, o desde Cobro del día toca la cuota del cliente. Los abonos se sincronizan en tiempo real.' },
  { q: '¿Qué es el cierre de operación?', a: 'Es el arqueo del día: consolida lo recaudado, gastos y bases para cuadrar el efectivo del cobrador.' },
  { q: '¿Cómo creo presets de interés/mora?', a: 'En la app: Ajustes → Interés y presets. Los presets aparecen al crear un crédito para aplicarlos con un toque.' },
];

export default function AyudaPage() {
  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={HelpCircle} title="Centro de ayuda" description="Guías rápidas y soporte para sacarle el máximo a Cobro Diario." />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <ActionCard icon={<MessageCircle className="h-5 w-5" />} title="Chat de soporte" desc="Habla con nuestro equipo" />
        <ActionCard icon={<BookOpen className="h-5 w-5" />} title="Documentación" desc="Guías paso a paso" />
        <ActionCard icon={<Mail className="h-5 w-5" />} title="Escríbenos" desc="soporte@cobrodiario.app" />
      </section>

      <Card>
        <CardHeader><CardTitle className="text-lg">Preguntas frecuentes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <p className="font-bold">{f.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-2 p-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
        <Button variant="secondary" size="sm" className="mt-1">Abrir</Button>
      </CardContent>
    </Card>
  );
}
