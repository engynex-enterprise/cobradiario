import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchClients, type Client } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function Clientes() {
  const router = useRouter();
  const { can } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    fetchClients().then((d) => setClients(d.clients)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const filtered = clients.filter((c) =>
    `${c.fullName} ${c.documentId ?? ''} ${c.city ?? ''}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.count}>{clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}</Text>
        </View>
        {can('manage_clients') && (
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => router.push('/(app)/nuevo-cliente' as never)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Buscar cliente…"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>Sin clientes.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => router.push(`/(app)/cliente/${item.id}` as never)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.fullName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.sub}>
                {[item.documentId, item.phone, item.city].filter(Boolean).join(' · ') || '—'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  count: { fontSize: 13, color: colors.muted, marginTop: 1 },
  addBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 4, borderBottomColor: colors.primaryDark,
  },
  searchWrap: { padding: 16, paddingBottom: 0 },
  search: {
    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4, padding: 14,
  },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e9f9e0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryDark, fontWeight: '800', fontSize: 16 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
