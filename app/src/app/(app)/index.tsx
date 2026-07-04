import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchDashboardStats, fetchLoans, type DashboardStats, type Loan } from '@/lib/graphql';
import { enqueuePayment, flushQueue, pendingCount } from '@/lib/offline-queue';
import { getSocket } from '@/lib/socket';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';
import { AbonoModal } from '@/components/abono-modal';

export default function Inicio() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pending, setPending] = useState(0);
  const [live, setLive] = useState(false);
  const [abonoLoan, setAbonoLoan] = useState<Loan | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([fetchLoans(), fetchDashboardStats()]);
      setLoans(l.loans);
      setStats(s.dashboardStats);
    } catch {
      /* offline: conserva lo cargado */
    } finally {
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

  async function confirmAbono(amount: number) {
    const loan = abonoLoan;
    setAbonoLoan(null);
    if (!loan || amount <= 0) return;
    await enqueuePayment({ loanId: loan.id, amount });
    setPending(await pendingCount());
    await syncQueue();
  }

  const Header = (
    <View style={styles.headerWrap}>
      <View style={styles.kpiRow}>
        <Kpi label="Cartera pendiente" value={stats ? money(stats.totalPortfolio) : '—'} />
        <Kpi label="Recaudado hoy" value={stats ? money(stats.collectedToday) : '—'} accent={colors.success} />
      </View>
      <View style={styles.kpiRow}>
        <Kpi label="Créditos activos" value={stats ? String(stats.activeLoans) : '—'} />
        <Kpi label="Cuotas en mora" value={stats ? String(stats.overdueInstallments) : '—'} accent={colors.danger} />
      </View>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Cartera</Text>
        <View style={styles.liveChip}>
          <View style={[styles.dot, { backgroundColor: live ? colors.success : colors.disabled }]} />
          <Text style={styles.liveText}>{live ? 'En vivo' : 'Sin conexión'}{pending > 0 ? ` · ${pending} por sincronizar` : ''}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={loans}
      keyExtractor={(l) => l.id}
      ListHeaderComponent={Header}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />}
      ListEmptyComponent={<Text style={styles.empty}>No hay créditos en tu ruta.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => router.push(`/(app)/loan/${item.id}` as never)}>
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
            onPress={() => setAbonoLoan(item)}
          >
            <Text style={styles.payBtnText}>{item.status === 'PAID' ? 'Pagado' : 'Registrar abono'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
    <AbonoModal loan={abonoLoan} visible={!!abonoLoan} onClose={() => setAbonoLoan(null)} onConfirm={confirmAbono} />
    </>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { gap: 12, marginBottom: 4 },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpi: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 14 },
  kpiLabel: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 16, gap: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    fontSize: 11, fontWeight: '800', color: colors.accentText, backgroundColor: colors.accent,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden',
  },
  balance: { fontSize: 20, fontWeight: '800', color: colors.text },
  detail: { fontSize: 13, color: colors.muted },
  payBtn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 13, alignItems: 'center',
    marginTop: 4, borderBottomWidth: 4, borderBottomColor: colors.primaryDark,
  },
  payBtnDisabled: { backgroundColor: colors.disabled, borderBottomColor: '#c8c8c8' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
});
