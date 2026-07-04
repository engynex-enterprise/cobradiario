import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { fetchDashboardStats } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { money } from '@/lib/format';
import { colors, initials } from '@/lib/theme';

export function TopBar() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [collected, setCollected] = useState(0);
  const [pending, setPending] = useState(0);

  const load = useCallback(() => {
    fetchDashboardStats()
      .then((d) => {
        setCollected(d.dashboardStats.collectedToday);
        setPending(d.dashboardStats.totalPortfolio);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    if (!socket) return;
    const onPay = () => load();
    socket.on('payment.registered', onPay);
    return () => {
      socket.off('payment.registered', onPay);
    };
  }, [load]);

  function go(path: string) {
    setMenu(false);
    router.push(path as never);
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      {/* Avatar (izq) */}
      <TouchableOpacity style={styles.avatar} onPress={() => setMenu(true)} activeOpacity={0.8}>
        <Text style={styles.avatarText}>{initials(user?.fullName).toUpperCase()}</Text>
      </TouchableOpacity>

      {/* Totales (der) */}
      <View style={styles.totals}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Recaudado hoy</Text>
          <Text style={[styles.totalValue, { color: colors.success }]}>{money(collected)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Por cobrar</Text>
          <Text style={styles.totalValue}>{money(pending)}</Text>
        </View>
      </View>

      {/* Menú del avatar */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenu(false)}>
          <Pressable style={[styles.sheet, { top: insets.top + 56 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.avatarLg}>
                <Text style={styles.avatarText}>{initials(user?.fullName).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{user?.fullName ?? 'Usuario'}</Text>
                <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
              </View>
            </View>
            <MenuRow icon="person-outline" label="Mi perfil" onPress={() => go('/(app)/perfil')} />
            <MenuRow icon="settings-outline" label="Ajustes" onPress={() => go('/(app)/ajustes')} />
            <View style={styles.sep} />
            <MenuRow icon="log-out-outline" label="Cerrar sesión" danger onPress={() => { setMenu(false); signOut(); }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.text} />
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.primary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  totals: { flexDirection: 'row', alignItems: 'center' },
  totalItem: { alignItems: 'flex-end' },
  totalLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 15, fontWeight: '800' },
  divider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,40,0.35)' },
  sheet: {
    position: 'absolute',
    left: 16,
    width: 260,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#0a2540',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  name: { fontWeight: '800', color: colors.text, fontSize: 15 },
  email: { color: colors.muted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});
