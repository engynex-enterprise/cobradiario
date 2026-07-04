import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchClients, fetchLoans, type Client, type Loan } from '@/lib/graphql';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function ClienteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    fetchClients().then((d) => setClient(d.clients.find((c) => c.id === id) ?? null)).catch(() => {});
    fetchLoans().then((d) => setLoans(d.loans.filter((l) => l.clientId === id))).catch(() => {});
  }, [id]);
  useEffect(() => load(), [load]);

  const totalBalance = loans.reduce((s, l) => s + l.balance, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(client?.fullName ?? '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{client?.fullName ?? 'Cliente'}</Text>
        <Text style={styles.sub}>
          {[client?.documentId, client?.phone, client?.city].filter(Boolean).join(' · ') || '—'}
        </Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Créditos</Text>
          <Text style={styles.statValue}>{loans.length}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Saldo total</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{money(totalBalance)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Créditos</Text>
      {loans.length === 0 ? (
        <Text style={styles.empty}>Este cliente no tiene créditos.</Text>
      ) : (
        loans.map((l) => (
          <TouchableOpacity key={l.id} style={styles.card} activeOpacity={0.7} onPress={() => router.push(`/(app)/loan/${l.id}` as never)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.badge}>{l.status}</Text>
              <Text style={styles.cardMeta}>Capital {money(l.principal)} · Pagado {money(l.paidAmount)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardBalance}>{money(l.balance)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accentText, fontWeight: '800', fontSize: 26 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 14 },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 14,
  },
  badge: {
    alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', color: colors.accentText,
    backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden',
  },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 6 },
  cardBalance: { fontSize: 17, fontWeight: '800', color: colors.text },
});
