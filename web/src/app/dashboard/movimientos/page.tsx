import { PageHeader } from '@/components/page-header';
import { MovementsTable } from '@/components/movements-table';

export default function MovimientosPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Movimientos"
        description="Todos los movimientos de caja registrados por los cobradores: cobros, gastos, consignaciones, desembolsos y ajustes, con su signo sobre el saldo."
      />
      <MovementsTable empty="Aún no hay movimientos de caja." />
    </div>
  );
}
