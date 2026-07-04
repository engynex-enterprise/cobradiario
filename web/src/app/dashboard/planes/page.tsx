'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, Users, HandCoins, Database } from 'lucide-react';

const PLANS = [
  {
    name: 'ORO', price: 'USD 3 / 100 clientes', tag: 'Recomendado', current: true,
    features: ['Múltiples dispositivos', 'Sincronización en la nube', 'Subcuentas (cobradores)', 'Acceso web + caja', 'WhatsApp Bot (opcional)'],
  },
  {
    name: 'BRONCE', price: 'USD 15 / año', tag: null, current: false,
    features: ['Un dispositivo por ruta', 'Copias manuales', 'Gastos y bases', 'Balances financieros'],
  },
  {
    name: 'GRATIS', price: 'USD 0', tag: null, current: false,
    features: ['Un dispositivo por ruta', 'Gestión básica de préstamos', 'Compartir e imprimir recibos'],
  },
];

export default function PlanesPage() {
  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={CreditCard} title="Planes y facturación" description="Tu plan actual, consumo del período y opciones para potenciar tu operación." />

      {/* Factura del período */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-primary/10 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total a pagar · este período</p>
            <p className="text-3xl font-extrabold text-primary">USD 3</p>
            <p className="text-sm text-muted-foreground">Plan actual: <Badge variant="success">ORO</Badge></p>
          </div>
          <Button>Pagar factura</Button>
        </div>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <Consumo icon={<Users className="h-4 w-4" />} label="Clientes" value="2" cost="USD 3" />
          <Consumo icon={<HandCoins className="h-4 w-4" />} label="Préstamos" value="—" cost="USD 0" />
          <Consumo icon={<Database className="h-4 w-4" />} label="Almacenamiento" value="0 MB" cost="USD 0" />
        </CardContent>
      </Card>

      {/* Planes */}
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.name} className={p.current ? 'border-2 border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{p.name}</CardTitle>
                {p.tag && <Badge variant="success">{p.tag}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{p.price}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={p.current ? 'secondary' : 'default'} disabled={p.current}>
                {p.current ? 'Plan actual' : 'Activar plan'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Consumo({ icon, label, value, cost }: { icon: React.ReactNode; label: string; value: string; cost: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">Uso: {value}</p>
      </div>
      <span className="text-sm font-bold">{cost}</span>
    </div>
  );
}
