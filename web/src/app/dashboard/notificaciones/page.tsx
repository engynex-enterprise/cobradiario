'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { fetchNotifications, markNotificationRead, type AppNotification } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { formatDate } from '@/lib/utils';
import { Bell, Check, CheckCheck } from 'lucide-react';

const TYPE_LABEL: Record<string, string> = {
  PAYMENT_DUE: 'Cuota por vencer',
  PAYMENT_RECEIVED: 'Abono recibido',
  LOAN_OVERDUE: 'Crédito en mora',
  LOAN_APPROVED: 'Crédito aprobado',
  ROUTE_ASSIGNED: 'Ruta asignada',
  CASHBOX_CLOSED: 'Caja cerrada',
  SYSTEM: 'Sistema',
};

export default function NotificacionesPage() {
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    fetchNotifications()
      .then((d) => setItems(d.myNotifications))
      .catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => load(), [load]);

  // Realtime: nuevas notificaciones aparecen en vivo.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNotif = () => load();
    socket.on('notification', onNotif);
    return () => {
      socket.off('notification', onNotif);
    };
  }, [load]);

  async function markRead(id: string) {
    try {
      await markNotificationRead(id);
      setItems((xs) => xs.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function markAll() {
    const unread = items.filter((n) => !n.readAt);
    await Promise.all(unread.map((n) => markNotificationRead(n.id).catch(() => {})));
    load();
  }

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Notificaciones"
        description="Avisos del sistema en tiempo real: créditos que caen en mora, cuotas por vencer y eventos de tu operación. Márcalas como leídas cuando las revises."
        actions={
          <>
            {unreadCount > 0 && <Badge>{unreadCount} sin leer</Badge>}
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAll}>
                <CheckCheck className="h-4 w-4" /> Marcar todas
              </Button>
            )}
          </>
        }
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <Bell className="h-8 w-8 opacity-40" />
            <p className="text-sm">Sin notificaciones por ahora.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.readAt ? 'opacity-70' : ''}>
              <CardContent className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary">
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    {!n.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TYPE_LABEL[n.type] ?? n.type} · {formatDate(n.createdAt)}
                  </p>
                </div>
                {!n.readAt && (
                  <button
                    onClick={() => markRead(n.id)}
                    title="Marcar como leída"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Check className="size-4" />
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
