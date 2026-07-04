import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { fetchLoans, type Loan } from '@/lib/graphql';
import { enqueuePayment, flushQueue, pendingCount } from '@/lib/offline-queue';
import { getSocket } from '@/lib/socket';
import { money } from '@/lib/format';

export default function RutaDelDia() {
  const { user, signOut } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { loans } = await fetchLoans();
      setLoans(loans);
    } catch {
      // Sin conexión: se conserva la última cartera cargada.
    } finally {
      setLoading(false);
      setPending(await pendingCount());
    }
  }, []);

  const syncQueue = useCallback(async () => {
    const res = await flushQueue();
    if (res.sent > 0) {
      Alert.alert('Sincronizado', `${res.sent} abono(s) enviado(s).`);
      await refresh();
    }
    setPending(await pendingCount());
  }, [refresh]);

  useEffect(() => {
    refresh();
    syncQueue();
  }, [refresh, syncQueue]);

  // Realtime: refresca al recibir un abono (propio o de otro cobrador del tenant).
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);
    const onPayment = () => refresh();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('payment.registered', onPayment);
    if (socket.connected) setLive(true);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('payment.registered', onPayment);
    };
  }, [refresh]);

  function onAbonar(loan: Loan) {
    Alert.prompt?.(
      'Registrar abono',
      `Saldo: ${money(loan.balance)}\nMonto a abonar:`,
      async (text) => {
        const amount = Number(text);
        if (!amount || amount <= 0) return;
        // Se encola SIEMPRE (offline-first) y se intenta drenar de inmediato.
        await enqueuePayment({ loanId: loan.id, amount });
        setPending(await pendingCount());
        await syncQueue();
      },
      'plain-text',
      '',
      'number-pad',
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {live ? '🟢 En vivo' : '⚪ Sin conexión en vivo'}
          {pending > 0 ? `  ·  ${pending} por sincronizar` : ''}
        </Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={loans}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No hay créditos en tu ruta.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.badge}>{item.status}</Text>
              <Text style={styles.balance}>{money(item.balance)}</Text>
            </View>
            <Text style={styles.detail}>
              Capital {money(item.principal)} · Pagado {money(item.paidAmount)}
            </Text>
            <TouchableOpacity
              style={[styles.payBtn, item.status === 'PAID' && styles.payBtnDisabled]}
              disabled={item.status === 'PAID'}
              onPress={() => onAbonar(item)}
            >
              <Text style={styles.payBtnText}>
                {item.status === 'PAID' ? 'Pagado' : 'Registrar abono'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  statusText: { fontSize: 13, color: '#065f46', fontWeight: '600' },
  logout: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3730a3',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  balance: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  detail: { fontSize: 13, color: '#64748b' },
  payBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  payBtnDisabled: { backgroundColor: '#cbd5e1' },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
