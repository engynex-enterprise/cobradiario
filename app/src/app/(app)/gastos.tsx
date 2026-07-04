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
import { Ionicons } from '@expo/vector-icons';
import { createExpense, fetchExpenses, type Expense } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

const nf = new Intl.NumberFormat('es-CO');
const CATEGORIES: { key: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'Transporte', icon: 'car', color: '#3b82f6' },
  { key: 'Oficina', icon: 'business', color: '#f97316' },
  { key: 'Sueldos', icon: 'people', color: '#9333ea' },
  { key: 'Servicios', icon: 'flash', color: '#eab308' },
  { key: 'Otro', icon: 'ellipsis-horizontal', color: colors.muted },
];
const catMeta = (c: string) => CATEGORIES.find((x) => x.key === c) ?? CATEGORIES[CATEGORIES.length - 1];

function fmtFull(iso: string) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export default function Gastos() {
  const router = useRouter();
  const [items, setItems] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetchExpenses().then((d) => setItems(d.expenses)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const total = items.reduce((s, e) => s + e.amount, 0);

  async function save(category: string, amount: number, note: string) {
    setOpen(false);
    if (amount <= 0) return;
    try {
      await createExpense({ category, amount, note: note.trim() || undefined });
      load();
    } catch {
      /* noop */
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.hero}>
        <View style={styles.heroBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Gastos</Text>
          <View style={{ width: 42 }} />
        </View>
        <Text style={styles.heroLabel}>Total de gastos</Text>
        <Text style={styles.heroAmount}>{money(total)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>No hay gastos registrados.</Text>
          </View>
        ) : (
          items.map((e) => {
            const m = catMeta(e.category);
            return (
              <View key={e.id} style={styles.card}>
                <View style={[styles.icon, { backgroundColor: `${m.color}18` }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cat}>{e.category}</Text>
                  <Text style={styles.meta}>{e.note ? `${e.note} · ` : ''}{fmtFull(e.createdAt)}</Text>
                </View>
                <Text style={styles.amount}>-{money(e.amount)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.fabWrap}>
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setOpen(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.fabText}>Nuevo gasto</Text>
        </TouchableOpacity>
      </View>

      <NewExpenseModal visible={open} onClose={() => setOpen(false)} onSave={save} />
    </View>
  );
}

function NewExpenseModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (c: string, a: number, n: string) => void }) {
  const [cat, setCat] = useState('Transporte');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (visible) { setCat('Transporte'); setAmount(0); setNote(''); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Nuevo gasto</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Ionicons name="close" size={20} color={colors.text} /></TouchableOpacity>
            </View>

            <Text style={styles.label}>Categoría</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const active = cat === c.key;
                return (
                  <TouchableOpacity key={c.key} style={[styles.chip, active && { borderColor: c.color, backgroundColor: `${c.color}18` }]} onPress={() => setCat(c.key)} activeOpacity={0.8}>
                    <Ionicons name={c.icon} size={15} color={active ? c.color : colors.muted} />
                    <Text style={[styles.chipText, active && { color: c.color }]}>{c.key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Monto</Text>
            <View style={styles.amountWrap}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.muted}
                value={amount > 0 ? nf.format(amount) : ''}
                onChangeText={(t) => setAmount(Number(t.replace(/[^\d]/g, '')) || 0)}
              />
            </View>

            <TextInput style={styles.note} placeholder="Nota (opcional)" placeholderTextColor={colors.muted} value={note} onChangeText={setNote} />

            <TouchableOpacity
              style={[styles.saveBtn, amount <= 0 && styles.saveDisabled]}
              disabled={amount <= 0}
              onPress={() => onSave(cat, amount, note)}
              activeOpacity={0.85}
            >
              <Text style={styles.saveText}>Registrar gasto</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginTop: 12 },
  heroAmount: { fontSize: 32, fontWeight: '800', color: '#fff' },
  emptyCard: { alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 20, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 30, marginTop: 8 },
  emptyText: { color: colors.muted, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 14 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cat: { fontSize: 15, fontWeight: '800', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: colors.danger },
  fabWrap: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 999, borderBottomWidth: 5, borderBottomColor: colors.primaryDark },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '800', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 2, borderColor: colors.border },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 14 },
  currency: { fontSize: 22, fontWeight: '800', color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text, paddingVertical: 12 },
  note: { borderWidth: 2, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 15, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: colors.primaryDark, marginTop: 4 },
  saveDisabled: { backgroundColor: colors.disabled, borderBottomColor: '#c8c8c8' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
