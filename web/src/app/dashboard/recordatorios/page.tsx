'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchReminders, type ReminderItem } from '@/lib/graphql';
import { formatDate } from '@/lib/utils';

const typeLabel: Record<string, string> = {
  PAYMENT_DUE: 'Cuota por vencer',
  LOAN_OVERDUE: 'Crédito en mora',
  SYSTEM: 'Sistema',
};
const statusVariant: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  SENT: 'success',
  SCHEDULED: 'warning',
  CANCELLED: 'secondary',
  FAILED: 'destructive',
};

export default function RecordatoriosPage() {
  const [items, setItems] = useState<ReminderItem[]>([]);

  useEffect(() => {
    fetchReminders()
      .then((d) => setItems(d.reminders))
      .catch((e) => toast.error(e.message));
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Recordatorios"
        description="Avisos programados de cuotas por vencer. El sistema los genera automáticamente cada día para anticipar el cobro y reducir la mora."
      />
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Sin recordatorios.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Programado</TableHead>
                  <TableHead>Enviado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{typeLabel[r.type] ?? r.type}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status] ?? 'secondary'}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.runAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.sentAt ? formatDate(r.sentAt) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
