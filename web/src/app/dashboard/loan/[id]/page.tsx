'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PayDialog } from '@/components/pay-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchLoanDetail, type LoanDetail } from '@/lib/graphql';
import { formatDate, money } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

const instVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PAID: 'success',
  OVERDUE: 'destructive',
  PARTIAL: 'warning',
  PENDING: 'secondary',
  WAIVED: 'secondary',
};

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<LoanDetail | null>(null);

  const load = useCallback(() => {
    if (!params?.id) return;
    fetchLoanDetail(params.id)
      .then((d) => setLoan(d.loan))
      .catch((e) => toast.error(e.message));
  }, [params?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loan) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Cargando…</div>;
  }

  const progress = loan.totalDue > 0 ? Math.round((loan.paidAmount / loan.totalDue) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/dashboard')}>
        <ArrowLeft className="h-4 w-4" /> Volver a la cartera
      </Button>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Capital" value={money(loan.principal)} />
        <Stat label="Interés" value={money(loan.interestTotal)} />
        <Stat label="Total a pagar" value={money(loan.totalDue)} />
        <Stat label="Saldo" value={money(loan.balance)} highlight />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Plan de cuotas</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {progress}% pagado · <Badge variant={loan.status === 'PAID' ? 'success' : 'default'}>{loan.status}</Badge>
            </p>
          </div>
          <PayDialog
            loan={{ ...loan, clientId: loan.clientId, createdAt: loan.createdAt }}
            onPaid={load}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cuota</TableHead>
                <TableHead>Capital</TableHead>
                <TableHead>Interés</TableHead>
                <TableHead>Mora</TableHead>
                <TableHead>Pagado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.installments.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.sequence}</TableCell>
                  <TableCell>{formatDate(it.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant={instVariant[it.status] ?? 'secondary'}>{it.status}</Badge>
                  </TableCell>
                  <TableCell>{money(it.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{money(it.principalPart)}</TableCell>
                  <TableCell className="text-muted-foreground">{money(it.interestPart)}</TableCell>
                  <TableCell className={it.lateFee > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {money(it.lateFee)}
                  </TableCell>
                  <TableCell className="text-emerald-600">{money(it.paidAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
