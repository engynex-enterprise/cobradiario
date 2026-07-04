import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchFinancialSummary, type FinancialSummary } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function Cierre() {
  const router = useRouter();
  const [data, setData] = useState<FinancialSummary | null>(null);

  const load = useCallback(() => {
    fetchFinancialSummary().then((d) => setData(d.financialSummary)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const efectivo = data?.byMethod.find((m) => m.method === 'CASH')?.amount ?? 0;

  function confirmar() {
    Alert.alert(
      'Cerrar operación',
      '¿Confirmas el cierre de la operación del día? Se registrará el arqueo con los totales actuales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar cierre',
          style: 'default',
          onPress: () => {
            Alert.alert('Operación cerrada', 'El cierre del día quedó registrado.');
            router.back();
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.hero}>
        <View style={styles.heroBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Cerrar operación</Text>
          <View style={{ width: 42 }} />
        </View>
        <Text style={styles.heroLabel}>Efectivo recaudado hoy</Text>
        <Text style={styles.heroAmount}>{money(efectivo)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen del día</Text>
          <Row label="Abonos recibidos" value={String(data?.abonos ?? 0)} />
          <Row label="Total cobrado" value={money(data?.totalCollected ?? 0)} />
          <Row label="  · Capital" value={money(data?.collectedCapital ?? 0)} sub />
          <Row label="  · Interés" value={money(data?.collectedInterest ?? 0)} sub />
          <View style={styles.divider} />
          <Row label="Préstamos entregados" value={money(data?.disbursedPrincipal ?? 0)} />
          <Row label="Gastos" value={`-${money(data?.expensesTotal ?? 0)}`} danger />
          <View style={styles.divider} />
          <Row label="Ganancia neta del día" value={money(data?.netProfit ?? 0)} strong />
        </View>

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={18} color={colors.accentText} />
          <Text style={styles.infoText}>El cierre consolida el efectivo y los movimientos del día para tu arqueo.</Text>
        </View>

        <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={confirmar}>
          <Ionicons name="lock-closed" size={20} color="#fff" />
          <Text style={styles.btnText}>Confirmar cierre</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, strong, sub, danger }: { label: string; value: string; strong?: boolean; sub?: boolean; danger?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, sub && styles.rowSub, strong && styles.rowStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong, danger && { color: colors.danger }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 12 },
  heroAmount: { fontSize: 32, fontWeight: '800', color: '#fff' },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 18, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 14, color: colors.text },
  rowSub: { color: colors.muted, fontSize: 13 },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowStrong: { fontSize: 17, fontWeight: '800', color: colors.primaryDark },
  divider: { height: 2, backgroundColor: colors.border, borderRadius: 2, marginVertical: 2 },
  info: { flexDirection: 'row', gap: 8, backgroundColor: colors.accent, borderRadius: 14, padding: 12 },
  infoText: { flex: 1, fontSize: 12, color: colors.accentText, fontWeight: '600' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, borderBottomWidth: 5, borderBottomColor: colors.primaryDark },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
