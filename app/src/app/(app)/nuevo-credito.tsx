import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createLoan,
  fetchClients,
  fetchCreditProducts,
  type Client,
  type CreditProduct,
} from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

const nf = new Intl.NumberFormat('es-CO');

const METHOD_LABEL: Record<string, string> = {
  FLAT: 'Interés fijo',
  DECLINING: 'Saldo decreciente',
  CUSTOM: 'Personalizado',
};
const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

export default function NuevoCredito() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [productId, setProductId] = useState<string | null>(null);
  const [principal, setPrincipal] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (clientId) fetchClients().then((d) => setClient(d.clients.find((c) => c.id === clientId) ?? null)).catch(() => {});
    fetchCreditProducts().then((d) => {
      setProducts(d.creditProducts);
      if (d.creditProducts[0]) setProductId(d.creditProducts[0].id);
    }).catch(() => {});
  }, [clientId]);
  useEffect(() => load(), [load]);

  const product = products.find((p) => p.id === productId) ?? null;

  async function submit() {
    if (!clientId || !productId || principal <= 0) return;
    setSaving(true);
    try {
      const { createLoan: loan } = await createLoan({ clientId, productId, principal });
      router.replace(`/(app)/loan/${loan.id}` as never);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el crédito');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Nuevo crédito</Text>
        {client ? <Text style={styles.clientLine}>Para {client.fullName}</Text> : null}

        <Text style={styles.label}>Monto del crédito</Text>
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

        <Text style={styles.label}>Producto de crédito</Text>
        {products.length === 0 ? (
          <Text style={styles.empty}>No hay productos configurados. Créalos desde la web.</Text>
        ) : (
          products.map((p) => {
            const active = p.id === productId;
            return (
              <TouchableOpacity key={p.id} style={[styles.product, active && styles.productActive]} activeOpacity={0.8} onPress={() => setProductId(p.id)}>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productMeta}>
                    {METHOD_LABEL[p.interestMethod] ?? p.interestMethod} · {p.interestRate}% · {p.termCount} cuotas · {FREQ_LABEL[p.frequency] ?? p.frequency}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {product && principal > 0 ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Resumen</Text>
            <Row label="Capital" value={money(principal)} />
            <Row label="Interés estimado" value={`${product.interestRate}%`} />
            <Row label="Cuotas" value={`${product.termCount} · ${FREQ_LABEL[product.frequency] ?? product.frequency}`} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, (!productId || principal <= 0 || saving) && styles.btnDisabled]}
          disabled={!productId || principal <= 0 || saving}
          onPress={submit}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crear crédito</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  clientLine: { fontSize: 14, color: colors.muted, marginTop: -8 },
  label: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 4 },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 2, borderColor: colors.border, paddingHorizontal: 16,
  },
  currency: { fontSize: 24, fontWeight: '800', color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.text, paddingVertical: 14 },
  empty: { color: colors.muted },
  product: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 2, borderColor: colors.border, padding: 14,
  },
  productActive: { borderColor: colors.primary, backgroundColor: '#f3fbe9' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  productName: { fontSize: 15, fontWeight: '800', color: colors.text },
  productMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  preview: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 16, gap: 8 },
  previewTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13, color: colors.muted },
  rowValue: { fontSize: 14, fontWeight: '800', color: colors.text },
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
