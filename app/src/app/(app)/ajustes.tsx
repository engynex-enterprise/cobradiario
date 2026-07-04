import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function Ajustes() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Ajustes</Text>

      <View style={styles.card}>
        <Field label="Servidor" value={API_URL} />
        <Field label="Versión" value={Constants.expoConfig?.version ?? '0.1.0'} last />
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
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
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
  field: { paddingVertical: 14 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel: { fontSize: 13, color: colors.muted },
  fieldValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 2 },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.danger, borderRadius: 16, paddingVertical: 14,
    borderBottomWidth: 4, borderBottomColor: colors.dangerDark,
  },
  logoutText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
});
