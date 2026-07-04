import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { colors, initials } from '@/lib/theme';

export default function Perfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

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
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.85}
          onPress={() => Alert.alert('Editar perfil', 'La edición de perfil estará disponible muy pronto.')}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editText}>Editar perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Field label="Nombre" value={user?.fullName ?? '—'} />
        <Field label="Correo" value={user?.email ?? '—'} />
        <Field label="Rol" value={user?.role ?? '—'} />
        <Field label="Tenant" value={user?.tenantId ?? '—'} last />
      </View>
    </ScrollView>
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
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
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
});
