import { PageHeader } from '@/components/page-header';
import { MovementsTable } from '@/components/movements-table';

export default function GastosPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Gastos"
        description="Egresos registrados en caja durante las jornadas (gasolina, transporte, papelería…). Se descuentan del saldo esperado en el arqueo del cobrador."
      />
      <MovementsTable type="EXPENSE" empty="Aún no hay gastos registrados." />
    </div>
  );
}
