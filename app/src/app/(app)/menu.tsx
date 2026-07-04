import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { colors, initials } from '@/lib/theme';

export default function Menu() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.fullName).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.fullName ?? 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Row icon="calendar-outline" label="Cobro del día" onPress={() => router.push('/(app)/cobro')} />
        <Row icon="person-outline" label="Mi perfil" onPress={() => router.push('/(app)/perfil')} />
        <Row icon="settings-outline" label="Ajustes" onPress={() => router.push('/(app)/ajustes')} last />
      </View>

      <View style={styles.group}>
        <Row icon="log-out-outline" label="Cerrar sesión" danger onPress={signOut} last />
      </View>

      <Text style={styles.version}>Cobro Diario · v0.1</Text>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 16,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  email: { fontSize: 13, color: colors.muted, marginTop: 1 },
  roleChip: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  roleText: { fontSize: 10, fontWeight: '700', color: colors.accentText },
  group: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 2, borderBottomColor: colors.border },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  version: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 8 },
});
