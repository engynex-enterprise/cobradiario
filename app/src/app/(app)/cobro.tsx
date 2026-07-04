import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchDueInstallments, type DueInstallment } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

type Tab = 'TODAY' | 'OVERDUE' | 'UPCOMING';
const TABS: { key: Tab; label: string }[] = [
  { key: 'TODAY', label: 'Hoy' },
  { key: 'OVERDUE', label: 'Vencidas' },
  { key: 'UPCOMING', label: 'Próximas' },
];

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

export default function Cobro() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('TODAY');
  const [items, setItems] = useState<DueInstallment[]>([]);

  const load = useCallback(() => {
    fetchDueInstallments(tab).then((d) => setItems(d.dueInstallments)).catch(() => {});
  }, [tab]);
  useEffect(() => load(), [load]);

  const total = items.reduce((s, i) => s + (i.amount + i.lateFee - i.paidAmount), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.h1}>Cobro del día</Text>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{items.length} cuota(s)</Text>
        <Text style={styles.totalValue}>Por cobrar: {money(total)}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.empty}>{tab === 'OVERDUE' ? 'Sin cuotas vencidas 🎉' : 'Sin cuotas.'}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => router.push(`/(app)/loan/${item.loanId}` as never)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.client}>{item.clientName ?? '—'}</Text>
              <Text style={styles.meta}>
                Cuota #{item.sequence} · vence {fmtDate(item.dueDate)}
                {item.lateFee > 0 ? ` · mora ${money(item.lateFee)}` : ''}
              </Text>
            </View>
            <Text style={styles.amount}>{money(item.amount + item.lateFee - item.paidAmount)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 16, paddingTop: 12 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, paddingHorizontal: 16, marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, borderColor: colors.border },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accentText },
  tabText: { fontWeight: '800', color: colors.muted, fontSize: 13 },
  tabTextActive: { color: colors.accentText },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 14 },
  totalLabel: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  totalValue: { color: colors.text, fontWeight: '800', fontSize: 13 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 14,
  },
  client: { fontSize: 15, fontWeight: '800', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
});
