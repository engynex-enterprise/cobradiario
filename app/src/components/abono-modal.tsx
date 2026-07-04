import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Loan } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

const nf = new Intl.NumberFormat('es-CO');

export function AbonoModal({
  loan,
  visible,
  onClose,
  onConfirm,
}: {
  loan: Loan | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(0);
  useEffect(() => {
    if (visible) setAmount(0);
  }, [visible, loan?.id]);

  if (!loan) return null;
  const display = amount > 0 ? nf.format(amount) : '';
  // Sugerencia de cuota diaria aproximada (total/plazo estimado no disponible → usa saldo).
  const quick = [5000, 10000, 20000, 50000];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.flexFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Registrar abono</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceLabel}>Saldo del crédito</Text>
          <Text style={styles.balance}>{money(loan.balance)}</Text>

          <Text style={styles.inputLabel}>Monto del abono</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.currency}>$</Text>
            <TextInput
              style={styles.input}
              value={display}
              onChangeText={(t) => setAmount(Number(t.replace(/[^\d]/g, '')) || 0)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
              autoFocus
            />
          </View>

          <View style={styles.chips}>
            {quick.map((q) => (
              <TouchableOpacity key={q} style={styles.chip} onPress={() => setAmount(q)}>
                <Text style={styles.chipText}>{nf.format(q)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.chip} onPress={() => setAmount(loan.balance)}>
              <Text style={styles.chipText}>Total</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.confirm, amount <= 0 && styles.confirmDisabled]}
            disabled={amount <= 0}
            onPress={() => onConfirm(amount)}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>Registrar {amount > 0 ? money(amount) : 'abono'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(31,41,51,0.45)', justifyContent: 'flex-end' },
  flexFill: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    gap: 6,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  balanceLabel: { fontSize: 12, color: colors.muted, marginTop: 8 },
  balance: { fontSize: 22, fontWeight: '800', color: colors.text },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 14, marginTop: 6, backgroundColor: colors.card,
  },
  currency: { fontSize: 22, fontWeight: '800', color: colors.muted, marginRight: 6 },
  input: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { borderWidth: 2, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  confirm: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    marginTop: 20, borderBottomWidth: 4, borderBottomColor: colors.primaryDark,
  },
  confirmDisabled: { backgroundColor: colors.disabled, borderBottomColor: '#c8c8c8' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
