import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@/lib/graphql';
import { colors } from '@/lib/theme';

export default function NuevoCliente() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', documentId: '', phone: '', address: '', city: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.fullName.trim()) return;
    setSaving(true);
    try {
      const { createClient: c } = await createClient({
        fullName: form.fullName.trim(),
        documentId: form.documentId.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
      });
      router.replace(`/(app)/cliente/${c.id}` as never);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Nuevo cliente</Text>

        <Field label="Nombre completo" value={form.fullName} onChange={set('fullName')} placeholder="Ej. Romina Torres" autoFocus />
        <Field label="Documento" value={form.documentId} onChange={set('documentId')} placeholder="Cédula / ID" keyboardType="number-pad" />
        <Field label="Teléfono" value={form.phone} onChange={set('phone')} placeholder="300 000 0000" keyboardType="phone-pad" />
        <Field label="Dirección" value={form.address} onChange={set('address')} placeholder="Calle 00 # 00-00" />
        <Field label="Ciudad" value={form.city} onChange={set('city')} placeholder="Ciudad" />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, (!form.fullName.trim() || saving) && styles.btnDisabled]}
          disabled={!form.fullName.trim() || saving}
          onPress={submit}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crear cliente</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  autoFocus?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType ?? 'default'}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  input: {
    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.text,
  },
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
