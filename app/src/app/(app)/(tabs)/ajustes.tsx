import Constants from 'expo-constants';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function Ajustes() {
  const router = useRouter();
  const soon = (t: string) => Alert.alert(t, 'Esta configuración estará disponible muy pronto.');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }}>
      <Text style={styles.h1}>Ajustes</Text>

      <Group title="Configuración del crédito">
        <Row icon="pricetag-outline" color="#22c55e" label="Interés y presets" onPress={() => soon('Interés y presets')} />
        <Row icon="time-outline" color="#f97316" label="Mora y días de gracia" onPress={() => soon('Mora')} />
        <Row icon="cube-outline" color="#9333ea" label="Productos de crédito" onPress={() => soon('Productos de crédito')} last />
      </Group>

      <Group title="Empresa">
        <Row icon="business-outline" color="#3b82f6" label="Datos de la empresa" onPress={() => soon('Datos de la empresa')} />
        <Row icon="cash-outline" color="#22c55e" label="Moneda" onPress={() => soon('Moneda')} />
        <Row icon="calendar-outline" color="#e0910a" label="Formato de fecha" onPress={() => soon('Formato de fecha')} />
        <Row icon="language-outline" color="#1899d6" label="Idioma" onPress={() => soon('Idioma')} last />
      </Group>

      <Group title="Equipo y rutas">
        <Row icon="people-outline" color="#9333ea" label="Usuarios" onPress={() => soon('Usuarios')} />
        <Row icon="map-outline" color="#22c55e" label="Rutas" onPress={() => soon('Rutas')} last />
      </Group>

      <Group title="Operación">
        <Row icon="calendar-number-outline" color="#3b82f6" label="Cobro del día" onPress={() => router.push('/(app)/cobro')} />
        <Row icon="receipt-outline" color="#ef4444" label="Gastos" onPress={() => router.push('/(app)/gastos')} />
        <Row icon="notifications-outline" color="#e0910a" label="Notificaciones" onPress={() => router.push('/(app)/notificaciones')} last />
      </Group>

      <Group title="Información">
        <Info label="Servidor" value={apiHost()} />
        <Info label="Versión" value={`v${Constants.expoConfig?.version ?? '0.1.0'}`} last />
      </Group>

      <Text style={styles.footer}>Cobro Diario</Text>
    </ScrollView>
  );
}

function apiHost() {
  try { return new URL(API_URL).host; } catch { return API_URL; }
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Row({ icon, color, label, onPress, last }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
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
  h1: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 4 },
  groupTitle: { fontSize: 13, fontWeight: '800', color: colors.muted, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  group: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  infoLabel: { flex: 1, fontSize: 14, color: colors.muted },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.text, maxWidth: '55%' },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 12 },
});
