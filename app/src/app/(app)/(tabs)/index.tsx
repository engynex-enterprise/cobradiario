import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { fetchDashboardStats, fetchDueInstallments, type DashboardStats, type DueInstallment } from '@/lib/graphql';
import { flushQueue, pendingCount } from '@/lib/offline-queue';
import { getSocket } from '@/lib/socket';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

function firstName(full?: string) {
  return full?.trim().split(/\s+/)[0] ?? '';
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

export default function Inicio() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [due, setDue] = useState<DueInstallment[]>([]);
  const [pending, setPending] = useState(0);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([fetchDashboardStats(), fetchDueInstallments('TODAY')]);
      setStats(s.dashboardStats);
      setDue(d.dueInstallments);
    } catch {
      /* offline */
    } finally {
      setPending(await pendingCount());
    }
  }, []);

  useEffect(() => {
    refresh();
    flushQueue().then(() => refresh()).catch(() => {});
  }, [refresh]);

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

  const dueTotal = due.reduce((s, i) => s + (i.amount + i.lateFee - i.paidAmount), 0);

  const Header = (
    <View style={{ gap: 14, marginBottom: 4 }}>
      <View>
        <Text style={styles.greeting}>¡Hola, {firstName(user?.fullName) || 'bienvenido'}! 👋</Text>
        <Text style={styles.sub}>Este es el resumen de tu día</Text>
      </View>

      <View style={styles.kpiRow}>
        <Kpi icon="wallet-outline" tint="#e9f9e0" tintColor={colors.primaryDark} label="Cartera pendiente" value={stats ? money(stats.totalPortfolio) : '—'} />
        <Kpi icon="cash-outline" tint={colors.accent} tintColor={colors.accentText} label="Recaudado hoy" value={stats ? money(stats.collectedToday) : '—'} />
      </View>
      <View style={styles.kpiRow}>
        <Kpi icon="albums-outline" tint="#f3e8ff" tintColor="#9333ea" label="Créditos activos" value={stats ? String(stats.activeLoans) : '—'} />
        <Kpi icon="alert-circle-outline" tint="#ffe5e5" tintColor={colors.danger} label="Cuotas en mora" value={stats ? String(stats.overdueInstallments) : '—'} />
      </View>

      <Text style={styles.sectionLabel}>Acciones rápidas</Text>
      <View style={styles.quickRow}>
        <Quick icon="person-add" label="Cliente" onPress={() => router.push('/(app)/nuevo-cliente' as never)} />
        <Quick icon="calendar-number" label="Cobro" onPress={() => router.push('/(app)/cobro' as never)} />
        <Quick icon="receipt" label="Gasto" onPress={() => router.push('/(app)/gastos' as never)} />
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Cobros de hoy</Text>
        <View style={styles.liveChip}>
          <View style={[styles.dot, { backgroundColor: live ? colors.success : colors.disabled }]} />
          <Text style={styles.liveText}>{live ? 'En vivo' : 'Sin conexión'}{pending > 0 ? ` · ${pending} por sincronizar` : ''}</Text>
        </View>
      </View>
      {due.length > 0 ? (
        <View style={styles.dueTotalCard}>
          <Text style={styles.dueTotalLabel}>{due.length} cuota(s) por cobrar hoy</Text>
          <Text style={styles.dueTotalValue}>{money(dueTotal)}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={due}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={Header}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.primary} />
          <Text style={styles.emptyText}>No tienes cobros pendientes para hoy 🎉</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.dueCard} activeOpacity={0.85} onPress={() => router.push(`/(app)/loan/${item.loanId}` as never)}>
          <View style={styles.dueIcon}>
            <Ionicons name="cash" size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dueClient}>{item.clientName ?? 'Cliente'}</Text>
            <Text style={styles.dueMeta}>
              Cuota #{item.sequence} · vence {fmtDate(item.dueDate)}
              {item.lateFee > 0 ? ` · mora ${money(item.lateFee)}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dueAmount}>{money(item.amount + item.lateFee - item.paidAmount)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

function Kpi({ icon, label, value, tint, tintColor }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tint: string; tintColor: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={tintColor} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function Quick({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quick} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpi: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 14, gap: 6 },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  quickRow: { flexDirection: 'row', gap: 12 },
  quick: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: colors.primaryDark },
  quickText: { fontSize: 13, fontWeight: '800', color: colors.text },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  dueTotalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e9f9e0', borderRadius: 14, padding: 14, borderWidth: 2, borderColor: colors.primary },
  dueTotalLabel: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  dueTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  emptyCard: { alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 20, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 30 },
  emptyText: { color: colors.muted, fontWeight: '600', textAlign: 'center' },
  dueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 14 },
  dueIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#e9f9e0', alignItems: 'center', justifyContent: 'center' },
  dueClient: { fontSize: 15, fontWeight: '800', color: colors.text },
  dueMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  dueAmount: { fontSize: 16, fontWeight: '800', color: colors.text },
});
