import { MovementsTable } from '@/components/movements-table';

export default function GastosPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
        <p className="text-sm text-muted-foreground">Egresos registrados en caja durante las jornadas.</p>
      </div>
      <MovementsTable type="EXPENSE" empty="Aún no hay gastos registrados." />
    </div>
  );
}
