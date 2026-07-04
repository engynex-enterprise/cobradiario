import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createCreditProduct, fetchCreditProducts, type CreditProduct } from '@/lib/graphql';
import { colors } from '@/lib/theme';

type Freq = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
const FREQS: { key: Freq; label: string }[] = [
  { key: 'DAILY', label: 'Diario' },
  { key: 'WEEKLY', label: 'Semanal' },
  { key: 'BIWEEKLY', label: 'Quincenal' },
  { key: 'MONTHLY', label: 'Mensual' },
];
const FREQ_LABEL: Record<string, string> = { DAILY: 'Diario', WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual', CUSTOM: 'Personalizado' };

export default function Productos() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CreditProduct[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetchCreditProducts().then((d) => setItems(d.creditProducts)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  async function save(input: { name: string; interestPct: number; termCount: number; freq: Freq; moraPct: number }) {
    setOpen(false);
    try {
      await createCreditProduct({
        name: input.name.trim(),
        interestRate: input.interestPct / 100,
        termCount: input.termCount,
        frequency: input.freq,
        interestMethod: 'FLAT',
        lateFeeType: input.moraPct > 0 ? 'PERCENT_OF_INSTALLMENT' : 'NONE',
        lateFeeValue: input.moraPct > 0 ? input.moraPct / 100 : 0,
      });
      load();
    } catch { /* noop */ }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <View style={styles.heroBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Productos y presets</Text>
          <View style={{ width: 42 }} />
        </View>
        <Text style={styles.heroSub}>Plantillas de interés y mora para aplicar al crear un crédito.</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>No hay productos. Crea el primero.</Text>
          </View>
        ) : (
          items.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.icon}><Ionicons name="cube" size={20} color={colors.primaryDark} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>
                  {Math.round(p.interestRate * 100)}% · {p.termCount} cuotas · {FREQ_LABEL[p.frequency] ?? p.frequency}
                  {p.lateFeeValue ? ` · mora ${Math.round(p.lateFeeValue * 100)}%` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setOpen(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.fabText}>Nuevo producto</Text>
        </TouchableOpacity>
      </View>

      <NewProductModal visible={open} onClose={() => setOpen(false)} onSave={save} />
    </View>
  );
}

function NewProductModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (i: { name: string; interestPct: number; termCount: number; freq: Freq; moraPct: number }) => void }) {
  const [name, setName] = useState('');
  const [interestPct, setInterestPct] = useState(20);
  const [termCount, setTermCount] = useState(20);
  const [moraPct, setMoraPct] = useState(0);
  const [freq, setFreq] = useState<Freq>('DAILY');
  useEffect(() => { if (visible) { setName(''); setInterestPct(20); setTermCount(20); setMoraPct(0); setFreq('DAILY'); } }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Nuevo producto</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Ionicons name="close" size={20} color={colors.text} /></TouchableOpacity>
            </View>

            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Diario 20%" placeholderTextColor={colors.muted} autoFocus />

            <Text style={styles.label}>Frecuencia</Text>
            <View style={styles.chips}>
              {FREQS.map((f) => (
                <TouchableOpacity key={f.key} style={[styles.chip, freq === f.key && styles.chipActive]} onPress={() => setFreq(f.key)}>
                  <Text style={[styles.chipText, freq === f.key && { color: colors.primaryDark }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.label}>Cuotas</Text>
                <TextInput style={styles.input} keyboardType="number-pad" value={String(termCount || '')} onChangeText={(t) => setTermCount(Number(t.replace(/[^\d]/g, '')) || 0)} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.label}>Interés %</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={interestPct ? String(interestPct) : ''} onChangeText={(t) => setInterestPct(Number(t.replace(/[^\d.]/g, '')) || 0)} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.label}>Mora %</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={moraPct ? String(moraPct) : ''} onChangeText={(t) => setMoraPct(Number(t.replace(/[^\d.]/g, '')) || 0)} />
              </View>
            </View>

            <TouchableOpacity style={[styles.saveBtn, !name.trim() && styles.saveDisabled]} disabled={!name.trim()} onPress={() => onSave({ name, interestPct, termCount, freq, moraPct })} activeOpacity={0.85}>
              <Text style={styles.saveText}>Guardar producto</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 10 },
  emptyCard: { alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 20, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 30, marginTop: 8 },
  emptyText: { color: colors.muted, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 14 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#e9f9e0', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 999, borderBottomWidth: 5, borderBottomColor: colors.primaryDark },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  input: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { borderColor: colors.primary, backgroundColor: '#f3fbe9' },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  row: { flexDirection: 'row', gap: 10 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: colors.primaryDark, marginTop: 6 },
  saveDisabled: { backgroundColor: colors.disabled, borderBottomColor: '#c8c8c8' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
