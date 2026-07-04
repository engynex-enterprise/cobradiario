import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchFinancialSummary, type FinancialSummary } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

const METHOD_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; tint: string; color: string }> = {
  CASH: { label: 'Efectivo', icon: 'cash-outline', tint: colors.accent, color: colors.accentText },
  CARD: { label: 'Tarjeta', icon: 'card-outline', tint: '#f3e8ff', color: '#9333ea' },
  TRANSFER: { label: 'Transferencia', icon: 'business-outline', tint: '#dcfce7', color: '#15803d' },
  OTHER: { label: 'Oficina', icon: 'briefcase-outline', tint: '#fff4e0', color: '#e07b00' },
};
const METHOD_ORDER = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

export default function ResumenFinanciero() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<FinancialSummary | null>(null);

  const load = useCallback(() => {
    fetchFinancialSummary().then((d) => setData(d.financialSummary)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const byMethod = new Map((data?.byMethod ?? []).map((m) => [m.method, m.amount]));
  const gananciaNeta = data?.netProfit ?? 0;
  const dineroEntregar = data ? data.totalCollected - data.disbursedPrincipal : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 18, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.h1}>Resumen financiero</Text>
      <Text style={styles.dayHint}>Actividad de hoy</Text>

      {/* Actividad del día */}
      <View style={styles.activityRow}>
        <View style={styles.activityCell}>
          <Ionicons name="cash-outline" size={22} color={colors.accentText} />
          <Text style={styles.activityValue}>{data?.abonos ?? 0}</Text>
          <Text style={styles.activityLabel}>N.º Abonos</Text>
        </View>
        <View style={styles.activityCell}>
          <Ionicons name="documents-outline" size={22} color="#e07b00" />
          <Text style={styles.activityValue}>{data?.prestamos ?? 0}</Text>
          <Text style={styles.activityLabel}>N.º Préstamos</Text>
        </View>
      </View>

      {/* Distribución de ingresos */}
      <Section title="Distribución de ingresos">
        <View style={styles.card}>
          <LineRow icon="wallet-outline" label="Capital" value={money(data?.collectedCapital ?? 0)} />
          <LineRow icon="trending-up-outline" label="Interés" value={money(data?.collectedInterest ?? 0)} />
          <LineRow icon="receipt-outline" label="Cargos" value={money(0)} />
          <LineRow icon="time-outline" label="Mora" value={money(data?.collectedLateFee ?? 0)} />
          <LineRow icon="pricetag-outline" label="Descuentos" value={money(0)} accent={colors.accentText} />
          <View style={styles.divider} />
          <LineRow icon="checkmark-circle" label="Total Cobrado" value={money(data?.totalCollected ?? 0)} strong iconColor={colors.success} />
        </View>
      </Section>

      {/* Medios de pago */}
      <Section title="Medios de pago">
        <View style={styles.card}>
          {METHOD_ORDER.map((m, i) => {
            const meta = METHOD_META[m];
            return (
              <View key={m} style={[styles.methodRow, i < METHOD_ORDER.length - 1 && styles.rowBorder]}>
                <View style={[styles.methodIcon, { backgroundColor: meta.tint }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <Text style={styles.methodLabel}>{meta.label}</Text>
                <Text style={styles.methodValue}>{money(byMethod.get(m) ?? 0)}</Text>
              </View>
            );
          })}
        </View>
      </Section>

      {/* Flujo de caja y resultados */}
      <Section title="Flujo de caja y resultados">
        <View style={styles.card}>
          <LineRow icon="sparkles-outline" label="Ganancia neta" value={money(gananciaNeta)} strong iconColor={colors.success} />
          <LineRow icon="receipt-outline" label="Gastos" value={`-${money(data?.expensesTotal ?? 0)}`} accent={colors.danger} />
          <LineRow icon="log-in-outline" label="Bases recibidas" value={money(0)} />
          <LineRow icon="log-out-outline" label="Bases entregadas" value={money(0)} />
          <LineRow icon="cash-outline" label="Préstamos realizados" value={money(data?.disbursedPrincipal ?? 0)} />
          <View style={styles.divider} />
          <LineRow icon="arrow-forward-circle-outline" label="Dinero a entregar" value={money(dineroEntregar)} strong iconColor={colors.accentText} valueColor={colors.accentText} />
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LineRow({
  icon,
  label,
  value,
  strong,
  accent,
  iconColor,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  strong?: boolean;
  accent?: string;
  iconColor?: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.lineRow}>
      <Ionicons name={icon} size={18} color={iconColor ?? colors.muted} />
      <Text style={[styles.lineLabel, strong && styles.lineLabelStrong]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineValueStrong, (accent || valueColor) ? { color: valueColor ?? accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  dayHint: { fontSize: 13, color: colors.muted, marginTop: -12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  activityRow: { flexDirection: 'row', gap: 12 },
  activityCell: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, alignItems: 'center', paddingVertical: 18, gap: 4 },
  activityValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  activityLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, paddingHorizontal: 14, paddingVertical: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  lineLabel: { flex: 1, fontSize: 15, color: colors.text },
  lineLabelStrong: { fontWeight: '800' },
  lineValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  lineValueStrong: { fontSize: 17, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  methodIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  methodValue: { fontSize: 15, fontWeight: '800', color: colors.text },
});
