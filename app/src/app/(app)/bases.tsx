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
import { createBaseMovement, fetchBaseMovements, type BaseMovement } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

const nf = new Intl.NumberFormat('es-CO');

function fmtFull(iso: string) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export default function Bases() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<BaseMovement[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetchBaseMovements().then((d) => setItems(d.baseMovements)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const recibido = items.filter((b) => b.type === 'RECEIVED').reduce((s, b) => s + b.amount, 0);
  const entregado = items.filter((b) => b.type === 'DELIVERED').reduce((s, b) => s + b.amount, 0);

  async function save(type: string, amount: number, note: string) {
    setOpen(false);
    if (amount <= 0) return;
    try { await createBaseMovement({ type, amount, note: note.trim() || undefined }); load(); } catch { /* noop */ }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <View style={styles.heroBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Bases</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Recibido</Text>
            <Text style={styles.heroStatValue}>{money(recibido)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Entregado</Text>
            <Text style={styles.heroStatValue}>{money(entregado)}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="swap-vertical-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>No hay movimientos de base registrados.</Text>
          </View>
        ) : (
          items.map((b) => {
            const received = b.type === 'RECEIVED';
            return (
              <View key={b.id} style={styles.card}>
                <View style={[styles.icon, { backgroundColor: received ? '#e9f9e0' : '#ddf4ff' }]}>
                  <Ionicons name={received ? 'log-in-outline' : 'log-out-outline'} size={20} color={received ? colors.primaryDark : colors.accentText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cat}>{received ? 'Base recibida' : 'Base entregada'}</Text>
                  <Text style={styles.meta}>{b.note ? `${b.note} · ` : ''}{fmtFull(b.createdAt)}</Text>
                </View>
                <Text style={[styles.amount, { color: received ? colors.primaryDark : colors.accentText }]}>
                  {received ? '+' : '−'}{money(b.amount)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setOpen(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.fabText}>Nueva base</Text>
        </TouchableOpacity>
      </View>

      <NewBaseModal visible={open} onClose={() => setOpen(false)} onSave={save} />
    </View>
  );
}

function NewBaseModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (t: string, a: number, n: string) => void }) {
  const [type, setType] = useState('RECEIVED');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  useEffect(() => { if (visible) { setType('RECEIVED'); setAmount(0); setNote(''); } }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Nueva base</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Ionicons name="close" size={20} color={colors.text} /></TouchableOpacity>
            </View>

            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, type === 'RECEIVED' && styles.typeBtnActive]} onPress={() => setType('RECEIVED')}>
                <Ionicons name="log-in-outline" size={18} color={type === 'RECEIVED' ? colors.primaryDark : colors.muted} />
                <Text style={[styles.typeText, type === 'RECEIVED' && { color: colors.primaryDark }]}>Recibida</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, type === 'DELIVERED' && styles.typeBtnActiveBlue]} onPress={() => setType('DELIVERED')}>
                <Ionicons name="log-out-outline" size={18} color={type === 'DELIVERED' ? colors.accentText : colors.muted} />
                <Text style={[styles.typeText, type === 'DELIVERED' && { color: colors.accentText }]}>Entregada</Text>
              </TouchableOpacity>
            </View>

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

            <TouchableOpacity style={[styles.saveBtn, amount <= 0 && styles.saveDisabled]} disabled={amount <= 0} onPress={() => onSave(type, amount, note)} activeOpacity={0.85}>
              <Text style={styles.saveText}>Registrar base</Text>
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
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },
  emptyCard: { alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 20, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 30, marginTop: 8 },
  emptyText: { color: colors.muted, fontWeight: '600', textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 14 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cat: { fontSize: 15, fontWeight: '800', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 999, borderBottomWidth: 5, borderBottomColor: colors.primaryDark },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 2, borderColor: colors.border },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: '#f3fbe9' },
  typeBtnActiveBlue: { borderColor: colors.accentText, backgroundColor: colors.accent },
  typeText: { fontSize: 14, fontWeight: '800', color: colors.muted },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 14 },
  currency: { fontSize: 22, fontWeight: '800', color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text, paddingVertical: 12 },
  note: { borderWidth: 2, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 15, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: colors.primaryDark, marginTop: 4 },
  saveDisabled: { backgroundColor: colors.disabled, borderBottomColor: '#c8c8c8' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
