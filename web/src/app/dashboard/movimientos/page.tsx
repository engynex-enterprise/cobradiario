import { MovementsTable } from '@/components/movements-table';

export default function MovimientosPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
        <p className="text-sm text-muted-foreground">Todos los movimientos de caja (cobros, gastos, consignaciones…).</p>
      </div>
      <MovementsTable empty="Aún no hay movimientos de caja." />
    </div>
  );
}
