import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

const nf = new Intl.NumberFormat('es-CO');

const TYPES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'CALL', label: 'Llamada', icon: 'call', color: '#22c55e' },
  { key: 'VISIT', label: 'Visita', icon: 'walk', color: '#3b82f6' },
  { key: 'SMS', label: 'SMS', icon: 'chatbubble', color: '#f97316' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25d366' },
  { key: 'EMAIL', label: 'Correo', icon: 'mail', color: '#ef4444' },
  { key: 'OTHER', label: 'Otro', icon: 'ellipsis-horizontal', color: colors.muted },
];

const RESULTS = [
  'Contactado', 'No contestó', 'Número equivocado', 'Promesa de pago',
  'Se negó a pagar', 'Se dejó mensaje', 'No disponible', 'Otro',
];

export interface GestionInput {
  type: string;
  result?: string;
  note?: string;
  promiseAmount?: number;
  promiseDate?: string;
  followUpDate?: string;
  followUpNote?: string;
}

function toISO(d: string): string | undefined {
  const t = d.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  const parsed = new Date(`${t}T12:00:00Z`);
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function GestionModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (input: GestionInput) => void;
}) {
  const [type, setType] = useState('CALL');
  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [promise, setPromise] = useState(false);
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState(0);
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  useEffect(() => {
    if (visible) {
      setType('CALL'); setResult(''); setNote(''); setShowResults(false);
      setPromise(false); setPromiseDate(''); setPromiseAmount(0);
      setFollowUp(false); setFollowUpDate(''); setFollowUpNote('');
    }
  }, [visible]);

  function save() {
    onSave({
      type,
      result: result || undefined,
      note: note.trim() || undefined,
      promiseAmount: promise && promiseAmount > 0 ? promiseAmount : undefined,
      promiseDate: promise ? toISO(promiseDate) : undefined,
      followUpDate: followUp ? toISO(followUpDate) : undefined,
      followUpNote: followUp ? followUpNote.trim() || undefined : undefined,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Ionicons name="headset" size={22} color={colors.primary} />
                <Text style={styles.title}>Nueva gestión</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Tipo de gestión</Text>
              <View style={styles.chips}>
                {TYPES.map((t) => {
                  const active = type === t.key;
                  return (
                    <TouchableOpacity key={t.key} style={[styles.typeChip, active && { borderColor: t.color, backgroundColor: `${t.color}18` }]} onPress={() => setType(t.key)} activeOpacity={0.8}>
                      <Ionicons name={t.icon} size={16} color={active ? t.color : colors.muted} />
                      <Text style={[styles.typeText, active && { color: t.color }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Resultado</Text>
              <TouchableOpacity style={styles.select} onPress={() => setShowResults((s) => !s)} activeOpacity={0.8}>
                <Text style={[styles.selectText, !result && { color: colors.muted }]}>{result || 'Selecciona un resultado'}</Text>
                <Ionicons name={showResults ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </TouchableOpacity>
              {showResults ? (
                <View style={styles.resultList}>
                  {RESULTS.map((r) => (
                    <TouchableOpacity key={r} style={styles.resultItem} onPress={() => { setResult(r); setShowResults(false); }}>
                      <Text style={[styles.resultText, result === r && { color: colors.primary, fontWeight: '800' }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <TextInput
                style={styles.noteInput}
                placeholder="Nota"
                placeholderTextColor={colors.muted}
                value={note}
                onChangeText={setNote}
                multiline
              />

              {/* Compromiso de pago */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Compromiso de pago</Text>
                <Switch value={promise} onValueChange={setPromise} trackColor={{ true: colors.primary }} />
              </View>
              {promise ? (
                <View style={{ gap: 10 }}>
                  <Field icon="calendar-outline" placeholder="Fecha de pago (AAAA-MM-DD)" value={promiseDate} onChange={setPromiseDate} keyboardType="numbers-and-punctuation" />
                  <View style={styles.amountWrap}>
                    <Text style={styles.currency}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="number-pad"
                      placeholder="Monto prometido"
                      placeholderTextColor={colors.muted}
                      value={promiseAmount > 0 ? nf.format(promiseAmount) : ''}
                      onChangeText={(t) => setPromiseAmount(Number(t.replace(/[^\d]/g, '')) || 0)}
                    />
                  </View>
                </View>
              ) : null}

              {/* Seguimiento */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Programar seguimiento</Text>
                <Switch value={followUp} onValueChange={setFollowUp} trackColor={{ true: colors.primary }} />
              </View>
              {followUp ? (
                <View style={{ gap: 10 }}>
                  <Field icon="calendar-outline" placeholder="Fecha de seguimiento (AAAA-MM-DD)" value={followUpDate} onChange={setFollowUpDate} keyboardType="numbers-and-punctuation" />
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Nota de seguimiento"
                    placeholderTextColor={colors.muted}
                    value={followUpNote}
                    onChangeText={setFollowUpNote}
                    multiline
                  />
                </View>
              ) : null}

              <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveText}>Guardar gestión</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ icon, placeholder, value, onChange, keyboardType }: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'numbers-and-punctuation';
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '800', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 2, borderColor: colors.border },
  typeText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  selectText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  resultList: { borderWidth: 2, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  resultItem: { paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultText: { fontSize: 15, color: colors.text },
  noteInput: { borderWidth: 2, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 15, color: colors.text, minHeight: 70, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14 },
  fieldInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },
  amountWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14 },
  currency: { fontSize: 20, fontWeight: '800', color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, paddingVertical: 13, fontSize: 17, fontWeight: '700', color: colors.text },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, borderBottomWidth: 4, borderBottomColor: colors.primaryDark, marginTop: 4 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
