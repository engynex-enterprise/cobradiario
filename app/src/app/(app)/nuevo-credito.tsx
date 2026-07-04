import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createLoan, fetchClients, fetchCreditProducts, type Client, type CreditProduct } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

const nf = new Intl.NumberFormat('es-CO');

type Freq = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
const FREQS: { key: Freq; label: string; unit: string; days: number }[] = [
  { key: 'DAILY', label: 'Diario', unit: 'días', days: 1 },
  { key: 'WEEKLY', label: 'Semanal', unit: 'semanas', days: 7 },
  { key: 'BIWEEKLY', label: 'Quincenal', unit: 'quincenas', days: 15 },
  { key: 'MONTHLY', label: 'Mensual', unit: 'meses', days: 30 },
];

function durationLabel(termCount: number, freq: Freq): string {
  const totalDays = termCount * (FREQS.find((x) => x.key === freq)?.days ?? 1);
  const parts = [`${nf.format(totalDays)} días`];
  if (totalDays >= 7) parts.push(`${(totalDays / 7).toFixed(totalDays % 7 === 0 ? 0 : 1)} sem`);
  if (totalDays >= 30) parts.push(`${(totalDays / 30).toFixed(totalDays % 30 === 0 ? 0 : 1)} meses`);
  if (totalDays >= 365) parts.push(`${(totalDays / 365).toFixed(1)} años`);
  return parts.join(' · ');
}

export default function NuevoCredito() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [presetId, setPresetId] = useState<string | null>(null);

  const [principal, setPrincipal] = useState(0);
  const [interestPct, setInterestPct] = useState(20);
  const [moraPct, setMoraPct] = useState(0);
  const [freq, setFreq] = useState<Freq>('DAILY');

  // Cálculo bidireccional: el campo editado por último "manda".
  const [driver, setDriver] = useState<'count' | 'amount'>('count');
  const [termCountInput, setTermCountInput] = useState(20);
  const [cuotaInput, setCuotaInput] = useState(0);

  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (clientId) fetchClients().then((d) => setClient(d.clients.find((c) => c.id === clientId) ?? null)).catch(() => {});
    fetchCreditProducts().then((d) => setProducts(d.creditProducts)).catch(() => {});
  }, [clientId]);
  useEffect(() => load(), [load]);

  const interestTotal = Math.round(principal * (interestPct / 100));
  const totalDue = principal + interestTotal;

  // Deriva cuotas ↔ valor según el "driver".
  const { termCount, cuota } = useMemo(() => {
    if (driver === 'count') {
      const n = Math.max(1, Math.round(termCountInput || 0));
      return { termCount: n, cuota: totalDue > 0 ? Math.round(totalDue / n) : 0 };
    }
    const c = Math.max(1, Math.round(cuotaInput || 0));
    return { termCount: totalDue > 0 && c > 0 ? Math.max(1, Math.round(totalDue / c)) : 0, cuota: c };
  }, [driver, termCountInput, cuotaInput, totalDue]);

  function applyPreset(p: CreditProduct) {
    setPresetId(p.id);
    setInterestPct(Math.round(p.interestRate * 100 * 100) / 100);
    if (p.lateFeeValue != null && (p.lateFeeType === 'PERCENT_OF_INSTALLMENT' || p.lateFeeType === 'PERCENT_OF_BALANCE')) {
      setMoraPct(Math.round(p.lateFeeValue * 100 * 100) / 100);
    }
    if (['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(p.frequency)) setFreq(p.frequency as Freq);
  }

  const valid = principal > 0 && termCount >= 1;

  async function submit() {
    if (!clientId || !valid) return;
    setSaving(true);
    try {
      const { createLoan: loan } = await createLoan({
        clientId,
        principal,
        termCount,
        interestRate: interestPct / 100,
        interestMethod: 'FLAT',
        rateBasis: 'PER_LOAN',
        frequency: freq,
        lateFeeType: moraPct > 0 ? 'PERCENT_OF_INSTALLMENT' : 'NONE',
        lateFeeValue: moraPct > 0 ? moraPct / 100 : 0,
      });
      router.replace(`/(app)/loan/${loan.id}` as never);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el crédito');
    } finally {
      setSaving(false);
    }
  }

  const unit = FREQS.find((f) => f.key === freq)!.unit;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Nuevo crédito</Text>
        {client ? <Text style={styles.clientLine}>Para {client.fullName}</Text> : null}

        {/* Preset de interés/mora desde config */}
        {products.length > 0 ? (
          <>
            <Text style={styles.label}>Preset (interés y mora)</Text>
            <View style={styles.freqWrap}>
              {products.map((p) => (
                <TouchableOpacity key={p.id} style={[styles.freqChip, presetId === p.id && styles.freqChipActive]} onPress={() => applyPreset(p)}>
                  <Text style={[styles.freqText, presetId === p.id && styles.freqTextActive]}>
                    {p.name} · {Math.round(p.interestRate * 100)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {/* 1. Monto */}
        <Text style={styles.label}>1. Valor a prestar</Text>
        <View style={styles.amountWrap}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={principal > 0 ? nf.format(principal) : ''}
            onChangeText={(t) => setPrincipal(Number(t.replace(/[^\d]/g, '')) || 0)}
          />
        </View>

        {/* Frecuencia */}
        <Text style={styles.label}>2. Frecuencia de pago</Text>
        <View style={styles.freqWrap}>
          {FREQS.map((f) => (
            <TouchableOpacity key={f.key} style={[styles.freqChip, freq === f.key && styles.freqChipActive]} onPress={() => setFreq(f.key)}>
              <Text style={[styles.freqText, freq === f.key && styles.freqTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. Cuotas ↔ valor (bidireccional) */}
        <Text style={styles.label}>3. Cuotas o valor (se calculan entre sí)</Text>
        <View style={styles.biRow}>
          <View style={[styles.biField, driver === 'count' && styles.biActive]}>
            <Text style={styles.biLabel}>N.º de {unit}</Text>
            <TextInput
              style={styles.biInput}
              keyboardType="number-pad"
              value={String(termCount || '')}
              onFocus={() => setDriver('count')}
              onChangeText={(t) => { setDriver('count'); setTermCountInput(Number(t.replace(/[^\d]/g, '')) || 0); }}
            />
          </View>
          <View style={styles.biArrow}>
            <Ionicons name="swap-horizontal" size={20} color={colors.muted} />
          </View>
          <View style={[styles.biField, driver === 'amount' && styles.biActive]}>
            <Text style={styles.biLabel}>Valor de cuota</Text>
            <TextInput
              style={styles.biInput}
              keyboardType="number-pad"
              value={cuota > 0 ? nf.format(cuota) : ''}
              onFocus={() => setDriver('amount')}
              onChangeText={(t) => { setDriver('amount'); setCuotaInput(Number(t.replace(/[^\d]/g, '')) || 0); }}
            />
          </View>
        </View>
        <Text style={styles.hintLine}>
          {driver === 'count'
            ? `→ El valor de cada cuota se calcula automáticamente.`
            : `→ El número de ${unit} se calcula automáticamente.`}
        </Text>

        {/* 4. Interés */}
        <Text style={styles.label}>4. Interés del crédito (%)</Text>
        <View style={styles.pctWrap}>
          <TextInput
            style={styles.pctInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={interestPct ? String(interestPct) : ''}
            onChangeText={(t) => setInterestPct(Number(t.replace(/[^\d.]/g, '')) || 0)}
          />
          <Text style={styles.pctSign}>%</Text>
          <Text style={styles.pctHint}>sobre el capital</Text>
        </View>

        {/* 5. Mora */}
        <Text style={styles.label}>5. Mora por cuota vencida (%)</Text>
        <View style={styles.pctWrap}>
          <TextInput
            style={styles.pctInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.muted}
            value={moraPct ? String(moraPct) : ''}
            onChangeText={(t) => setMoraPct(Number(t.replace(/[^\d.]/g, '')) || 0)}
          />
          <Text style={styles.pctSign}>%</Text>
          <Text style={styles.pctHint}>de la cuota atrasada</Text>
        </View>

        {/* Resumen */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Resumen del crédito</Text>
          <SumRow label="Capital a prestar" value={money(principal)} />
          <SumRow label={`Interés (${interestPct}%)`} value={money(interestTotal)} />
          <SumRow label="Total con interés" value={money(totalDue)} strong />
          <View style={styles.divider} />
          <SumRow label={`Valor de cuota (${termCount})`} value={money(cuota)} />
          <SumRow label="Duración" value={durationLabel(termCount, freq)} small />
          {moraPct > 0 ? <SumRow label="Mora por cuota" value={`${moraPct}%`} small /> : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, (!valid || saving) && styles.btnDisabled]}
          disabled={!valid || saving}
          onPress={submit}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crear crédito</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SumRow({ label, value, strong, small }: { label: string; value: string; strong?: boolean; small?: boolean }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumLabel, small && { fontSize: 12 }]}>{label}</Text>
      <Text style={[styles.sumValue, strong && styles.sumStrong, small && { fontSize: 13 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  clientLine: { fontSize: 14, color: colors.muted, marginTop: -8 },
  label: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 4 },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 2, borderColor: colors.border, paddingHorizontal: 16,
  },
  currency: { fontSize: 24, fontWeight: '800', color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.text, paddingVertical: 14 },
  freqWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  freqChipActive: { borderColor: colors.primary, backgroundColor: '#f3fbe9' },
  freqText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  freqTextActive: { color: colors.primaryDark },
  biRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  biField: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  biActive: { borderColor: colors.primary, backgroundColor: '#f3fbe9' },
  biLabel: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  biInput: { fontSize: 18, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  biArrow: { width: 24, alignItems: 'center' },
  hintLine: { fontSize: 12, color: colors.accentText, fontWeight: '600', marginTop: -6 },
  pctWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 14 },
  pctInput: { fontSize: 20, fontWeight: '800', color: colors.text, paddingVertical: 12, minWidth: 60 },
  pctSign: { fontSize: 18, fontWeight: '800', color: colors.muted },
  pctHint: { fontSize: 12, color: colors.muted, marginLeft: 'auto' },
  summary: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, padding: 16, gap: 9, marginTop: 4 },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 13, color: colors.muted, flex: 1 },
  sumValue: { fontSize: 14, fontWeight: '800', color: colors.text, textAlign: 'right' },
  sumStrong: { fontSize: 17, color: colors.primaryDark },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28,
    backgroundColor: colors.card, borderTopWidth: 2, borderTopColor: colors.border,
  },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    borderBottomWidth: 4, borderBottomColor: colors.primaryDark,
  },
  btnDisabled: { backgroundColor: colors.disabled, borderBottomColor: '#c8c8c8' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
