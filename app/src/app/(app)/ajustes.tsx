import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { colors, initials } from '@/lib/theme';

export default function Ajustes() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }}>
      <View style={styles.profile}>
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
        <TouchableOpacity style={styles.logoutIcon} onPress={signOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <Group title="Mi cuenta">
        <Row icon="person-outline" label="Datos de la cuenta" onPress={() => router.push('/(app)/perfil')} last />
      </Group>

      <Group title="Operación">
        <Row icon="calendar-outline" label="Cobro del día" onPress={() => router.push('/(app)/cobro')} />
        <Row icon="receipt-outline" label="Gastos" onPress={() => router.push('/(app)/gastos')} />
        <Row icon="notifications-outline" label="Notificaciones" onPress={() => router.push('/(app)/notificaciones')} last />
      </Group>

      <Group title="Información">
        <Info label="Servidor" value={apiHost()} />
        <Info label="Versión" value={`v${Constants.expoConfig?.version ?? '0.1.0'}`} last />
      </Group>

      <TouchableOpacity style={styles.logout} onPress={signOut} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Cobro Diario</Text>
    </ScrollView>
  );
}

function apiHost() {
  try {
    return new URL(API_URL).host;
  } catch {
    return API_URL;
  }
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

function Info({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 16,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accentText, fontWeight: '800', fontSize: 20 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  email: { fontSize: 13, color: colors.muted, marginTop: 1 },
  roleChip: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  roleText: { fontSize: 10, fontWeight: '800', color: colors.accentText },
  logoutIcon: { padding: 4 },
  groupTitle: { fontSize: 13, fontWeight: '800', color: colors.muted, marginLeft: 4 },
  group: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f3fbe9', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  infoLabel: { flex: 1, fontSize: 14, color: colors.muted },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.text, maxWidth: '55%' },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.danger, borderRadius: 16, paddingVertical: 15,
    borderBottomWidth: 4, borderBottomColor: colors.dangerDark,
  },
  logoutText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 12 },
});
