import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchNotifications, markNotificationRead, type AppNotification } from '@/lib/graphql';
import { getSocket } from '@/lib/socket';
import { colors } from '@/lib/theme';

const TYPE_LABEL: Record<string, string> = {
  PAYMENT_DUE: 'Cuota por vencer',
  PAYMENT_RECEIVED: 'Abono recibido',
  LOAN_OVERDUE: 'Crédito en mora',
  LOAN_APPROVED: 'Crédito aprobado',
  ROUTE_ASSIGNED: 'Ruta asignada',
  CASHBOX_CLOSED: 'Caja cerrada',
  SYSTEM: 'Sistema',
};

export default function Notificaciones() {
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    fetchNotifications().then((d) => setItems(d.myNotifications)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNotif = () => load();
    socket.on('notification', onNotif);
    return () => {
      socket.off('notification', onNotif);
    };
  }, [load]);

  async function onPressItem(n: AppNotification) {
    if (n.readAt) return;
    setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    markNotificationRead(n.id).catch(() => {});
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name="notifications-off-outline" size={32} color={colors.muted} />
          <Text style={styles.empty}>Sin notificaciones.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, !item.readAt && styles.unread]}
          activeOpacity={0.7}
          onPress={() => onPressItem(item)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={18} color={colors.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              {!item.readAt && <View style={styles.dot} />}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{TYPE_LABEL[item.type] ?? item.type}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  emptyWrap: { alignItems: 'center', gap: 8, marginTop: 60 },
  empty: { textAlign: 'center', color: colors.muted },
  card: {
    flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 14,
  },
  unread: { borderColor: colors.accentText },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  body: { fontSize: 13, color: colors.muted, marginTop: 2 },
  meta: { fontSize: 11, color: colors.muted, marginTop: 4, fontWeight: '600' },
});
