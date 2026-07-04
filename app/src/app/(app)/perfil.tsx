import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { updateProfile } from '@/lib/graphql';
import { colors, initials } from '@/lib/theme';

export default function Perfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [edit, setEdit] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 16 }}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.fullName).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName ?? 'Usuario'}</Text>
        <View style={styles.roleChip}><Text style={styles.roleText}>{user?.role}</Text></View>
        <TouchableOpacity style={styles.editBtn} activeOpacity={0.85} onPress={() => setEdit(true)}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editText}>Editar perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Field label="Nombre" value={user?.fullName ?? '—'} />
        <Field label="Correo" value={user?.email ?? '—'} />
        <Field label="Teléfono" value={user?.phone ?? '—'} />
        <Field label="Rol" value={user?.role ?? '—'} last />
      </View>

      <EditModal
        visible={edit}
        fullName={user?.fullName ?? ''}
        phone={user?.phone ?? ''}
        onClose={() => setEdit(false)}
        onSaved={(u) => { updateUser({ fullName: u.fullName, phone: u.phone }); setEdit(false); }}
      />
    </ScrollView>
  );
}

function EditModal({ visible, fullName, phone, onClose, onSaved }: { visible: boolean; fullName: string; phone: string; onClose: () => void; onSaved: (u: { fullName: string; phone?: string }) => void }) {
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (visible) { setName(fullName); setTel(phone); } }, [visible, fullName, phone]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { updateProfile: u } = await updateProfile({ fullName: name.trim(), phone: tel.trim() });
      onSaved({ fullName: u.fullName, phone: u.phone });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Editar perfil</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Ionicons name="close" size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={colors.muted} autoFocus />
            <Text style={styles.label}>Teléfono</Text>
            <TextInput style={styles.input} value={tel} onChangeText={setTel} placeholder="300 000 0000" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
            <TouchableOpacity style={[styles.saveBtn, (!name.trim() || saving) && styles.saveDisabled]} disabled={!name.trim() || saving} onPress={save} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar cambios</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: colors.primaryDark },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 26 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  roleChip: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: '700', color: colors.accentText },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 4, borderBottomColor: colors.primaryDark, marginTop: 4 },
  editText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, paddingHorizontal: 16 },
  field: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 14 },
  fieldBorder: { borderBottomWidth: 2, borderBottomColor: colors.border },
  fieldLabel: { fontSize: 14, color: colors.muted },
  fieldValue: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  input: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: colors.primaryDark, marginTop: 6 },
  saveDisabled: { backgroundColor: colors.disabled, borderBottomColor: '#c8c8c8' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
