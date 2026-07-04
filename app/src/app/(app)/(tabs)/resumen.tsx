import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchBalances, fetchDashboardStats, type Balances, type DashboardStats } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function Resumen() {
  const router = useRouter();
  const [bal, setBal] = useState<Balances | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const load = useCallback(() => {
    fetchBalances().then((d) => setBal(d.balances)).catch(() => {});
    fetchDashboardStats().then((d) => setStats(d.dashboardStats)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const pct = bal && bal.totalDue > 0 ? Math.round((bal.totalPaid / bal.totalDue) * 100) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
    >
      <Text style={styles.h1}>Resumen</Text>

      <View style={styles.grid}>
        <Tile icon="cash-outline" tint={colors.accent} tintText={colors.accentText} label="Recaudado" value={money(bal?.totalPaid ?? 0)} />
        <Tile icon="trending-up-outline" tint="#e9f9e0" tintText={colors.primaryDark} label="Capital colocado" value={money(bal?.totalPrincipal ?? 0)} />
        <Tile icon="wallet-outline" tint="#fff4e0" tintText="#e07b00" label="Por cobrar" value={money(bal?.outstanding ?? 0)} />
        <Tile icon="alert-circle-outline" tint="#ffe5e5" tintText={colors.danger} label="Cuotas en mora" value={String(stats?.overdueInstallments ?? 0)} />
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHead}>
          <Text style={styles.progressTitle}>Progreso de cobranza</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(pct, 100)}%` }]} />
        </View>
        <View style={styles.progressFoot}>
          <Text style={styles.footMuted}>{money(bal?.totalPaid ?? 0)}</Text>
          <Text style={styles.footStrong}>de {money(bal?.totalDue ?? 0)}</Text>
        </View>
        <Text style={styles.note}>No incluye mora ni cargos en el progreso de cobro.</Text>
      </View>

      <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={() => router.push('/(app)/resumen-financiero' as never)}>
        <View style={styles.ctaIcon}>
          <Ionicons name="bar-chart-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Ver resumen financiero</Text>
          <Text style={styles.ctaSub}>Ingresos, medios de pago y flujo de caja</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

function Tile({
  icon,
  label,
  value,
  tint,
  tintText,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
  tintText: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={tintText} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4,
    borderColor: colors.border, padding: 14, gap: 6,
  },
  tileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  tileValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  progressCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 16, gap: 8 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  progressPct: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  track: { height: 12, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 12, backgroundColor: colors.primary, borderRadius: 999 },
  progressFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  footMuted: { fontSize: 13, color: colors.muted, fontWeight: '700' },
  footStrong: { fontSize: 13, color: colors.text, fontWeight: '800' },
  note: { fontSize: 11, color: colors.muted },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary,
    borderRadius: 16, padding: 16, borderBottomWidth: 5, borderBottomColor: colors.primaryDark,
  },
  ctaIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});
