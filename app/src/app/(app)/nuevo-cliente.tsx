import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@/lib/graphql';
import { colors } from '@/lib/theme';

export default function NuevoCliente() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const initial = form.fullName.trim().slice(0, 1).toUpperCase() || '?';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Hero verde */}
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <View style={styles.heroBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Nuevo cliente</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.avatarName}>{form.fullName.trim() || 'Nombre del cliente'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Field icon="person-outline" label="Nombre completo" value={form.fullName} onChange={set('fullName')} placeholder="Ej. Romina Torres" autoFocus />
          <Field icon="card-outline" label="Documento" value={form.documentId} onChange={set('documentId')} placeholder="Cédula / ID" keyboardType="number-pad" />
          <Field icon="call-outline" label="Teléfono" value={form.phone} onChange={set('phone')} placeholder="300 000 0000" keyboardType="phone-pad" />
          <Field icon="home-outline" label="Dirección" value={form.address} onChange={set('address')} placeholder="Calle 00 # 00-00" />
          <Field icon="location-outline" label="Ciudad" value={form.city} onChange={set('city')} placeholder="Ciudad" last />
        </View>
        <Text style={styles.hint}>Solo el nombre es obligatorio. El resto lo puedes completar después.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          style={[styles.btn, (!form.fullName.trim() || saving) && styles.btnDisabled]}
          disabled={!form.fullName.trim() || saving}
          onPress={submit}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Crear cliente</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoFocus,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  autoFocus?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  avatarWrap: { alignItems: 'center', gap: 8, marginTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.08)' },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.primaryDark },
  avatarName: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, paddingHorizontal: 14 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#e9f9e0', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted },
  input: { fontSize: 16, fontWeight: '600', color: colors.text, paddingVertical: 2, paddingTop: 2 },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', paddingHorizontal: 20 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16,
    backgroundColor: colors.card, borderTopWidth: 2, borderTopColor: colors.border,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15,
    borderBottomWidth: 4, borderBottomColor: colors.primaryDark,
  },
  btnDisabled: { backgroundColor: colors.disabled, borderBottomColor: '#c8c8c8' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
