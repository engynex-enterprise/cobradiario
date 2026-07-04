import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchBalances, type Balances } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors, initials } from '@/lib/theme';

export default function BalancesScreen() {
  const [bal, setBal] = useState<Balances | null>(null);

  const load = useCallback(() => {
    fetchBalances().then((d) => setBal(d.balances)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const pct = bal && bal.totalDue > 0 ? Math.round((bal.totalPaid / bal.totalDue) * 100) : 0;
  const max = bal?.byCollector[0]?.collected || 1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
    >
      <Text style={styles.h1}>Balances</Text>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Saldo por cobrar</Text>
        <Text style={styles.heroValue}>{money(bal?.outstanding ?? 0)}</Text>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroSubLabel}>Capital colocado</Text>
            <Text style={styles.heroSubValue}>{money(bal?.totalPrincipal ?? 0)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.heroSubLabel}>Total a cobrar</Text>
            <Text style={styles.heroSubValue}>{money(bal?.totalDue ?? 0)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Avance de recaudo</Text>
          <Text style={styles.pct}>{pct}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(pct, 100)}%` }]} />
        </View>
        <Text style={styles.subtle}>
          {money(bal?.totalPaid ?? 0)} de {money(bal?.totalDue ?? 0)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recaudo por cobrador</Text>
      <View style={styles.card}>
        {!bal || bal.byCollector.length === 0 ? (
          <Text style={styles.empty}>Aún no hay pagos registrados.</Text>
        ) : (
          bal.byCollector.map((c, i) => (
            <View key={c.collectorId} style={[styles.collector, i < bal.byCollector.length - 1 && styles.collectorBorder]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(c.collectorName ?? '?').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.collectorName}>{c.collectorName ?? 'Sin nombre'}</Text>
                <View style={styles.miniTrack}>
                  <View style={[styles.miniFill, { width: `${Math.round((c.collected / max) * 100)}%` }]} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.collectorAmount}>{money(c.collected)}</Text>
                <Text style={styles.collectorCount}>{c.payments} pago{c.payments === 1 ? '' : 's'}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={18} color={colors.accentText} />
        <Text style={styles.infoText}>Los balances consolidan todos los créditos activos e históricos de la operación.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  hero: {
    backgroundColor: colors.accentText, borderRadius: 20, padding: 18, gap: 4,
    borderBottomWidth: 4, borderBottomColor: '#0f6ea0',
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  heroValue: { color: '#fff', fontSize: 32, fontWeight: '800' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  heroSubLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  heroSubValue: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 1 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 16, gap: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  pct: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  track: { height: 12, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 12, backgroundColor: colors.primary, borderRadius: 999 },
  subtle: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 12 },
  collector: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  collectorBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accentText, fontWeight: '800', fontSize: 13 },
  collectorName: { fontSize: 14, fontWeight: '700', color: colors.text },
  miniTrack: { height: 6, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden', marginTop: 5 },
  miniFill: { height: 6, backgroundColor: colors.primary, borderRadius: 999 },
  collectorAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  collectorCount: { fontSize: 11, color: colors.muted },
  info: { flexDirection: 'row', gap: 8, backgroundColor: colors.accent, borderRadius: 14, padding: 12 },
  infoText: { flex: 1, fontSize: 12, color: colors.accentText, fontWeight: '600' },
});
