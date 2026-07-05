import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchClients, fetchLoans, type Client, type Loan } from '@/lib/graphql';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';
import { colors, initials } from '@/lib/theme';

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diario', WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual', CUSTOM: 'Personalizado',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export default function ClienteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const insets = useSafeAreaInsets();
  const [client, setClient] = useState<Client | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    fetchClients().then((d) => setClient(d.clients.find((c) => c.id === id) ?? null)).catch(() => {});
    fetchLoans().then((d) => setLoans(d.loans.filter((l) => l.clientId === id))).catch(() => {});
  }, [id]);
  useEffect(() => load(), [load]);

  const activos = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'PENDING_APPROVAL');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Hero verde Duolingo */}
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <View style={styles.heroBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(client?.fullName).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.name}>{client?.fullName ?? 'Cliente'}</Text>
        <View style={styles.docRow}>
          <Ionicons name="card-outline" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.doc}>{client?.documentId ?? 'Sin documento'}</Text>
          <View style={styles.cityChip}>
            <Ionicons name="location" size={12} color="#fff" />
            <Text style={styles.cityText}>{client?.city ?? 'Sin asignar'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        {/* Acciones rápidas */}
        <View style={styles.quickRow}>
          <Quick icon="call" label="Llamar" onPress={() => {}} />
          {can('manage_clients') && <Quick icon="create" label="Editar" onPress={() => {}} />}
          {can('manage_loans') && <Quick icon="add-circle" label="Prestar" primary onPress={() => router.push(`/(app)/nuevo-credito?clientId=${id}` as never)} />}
        </View>

        {/* Sección créditos */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Créditos activos</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{activos.length}</Text>
          </View>
        </View>

        {loans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cash-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>Este cliente no tiene créditos todavía.</Text>
          </View>
        ) : (
          loans.map((l) => {
            const cuota = l.termCount && l.termCount > 0 ? Math.round(l.totalDue / l.termCount) : 0;
            const pct = l.totalDue > 0 ? Math.round((l.paidAmount / l.totalDue) * 100) : 0;
            return (
              <TouchableOpacity key={l.id} style={styles.loanCard} activeOpacity={0.85} onPress={() => router.push(`/(app)/loan/${l.id}` as never)}>
                <View style={styles.loanTop}>
                  <View style={styles.coin}>
                    <Ionicons name="cash" size={22} color={colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loanAmount}>{money(l.principal)}</Text>
                    {l.code ? <Text style={styles.code}>#{l.code}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                </View>

                <View style={styles.progressWrap}>
                  <View style={[styles.progressBar, { width: `${Math.min(pct, 100)}%` }]} />
                </View>
                <Text style={styles.paidLine}>
                  Pagado {money(l.paidAmount)} de {money(l.totalDue)} · {pct}%
                </Text>

                <View style={styles.metaRow}>
                  <Meta label="Valor cuota" value={money(cuota)} />
                  <Meta label="Cuotas" value={`${l.termCount ?? '—'}`} />
                  <Meta label="Interés" value={l.interestRate != null ? `${Math.round(l.interestRate * 100)}%` : '—'} />
                </View>

                <View style={styles.loanFoot}>
                  <View style={styles.freqPill}>
                    <Ionicons name="calendar" size={13} color={colors.accentText} />
                    <Text style={styles.freqText}>{FREQ_LABEL[l.frequency ?? ''] ?? '—'}</Text>
                  </View>
                  <Text style={styles.footDate}>{fmtDate(l.firstDueDate)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {can('manage_loans') && (
          <TouchableOpacity style={styles.newLoanBtn} activeOpacity={0.85} onPress={() => router.push(`/(app)/nuevo-credito?clientId=${id}` as never)}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.newLoanText}>Crear crédito</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function Quick({ icon, label, onPress, primary }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <TouchableOpacity style={[styles.quick, primary && styles.quickPrimary]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={22} color={primary ? '#fff' : colors.primaryDark} />
      <Text style={[styles.quickText, primary && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 6 },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.08)' },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.primaryDark },
  name: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 4 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  doc: { fontSize: 15, color: 'rgba(255,255,255,0.95)', fontWeight: '700' },
  cityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  cityText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  quick: { flex: 1, alignItems: 'center', gap: 5, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, paddingVertical: 14, borderBottomWidth: 4 },
  quickPrimary: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  quickText: { fontSize: 13, fontWeight: '800', color: colors.text },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  countPill: { backgroundColor: colors.primary, borderRadius: 999, minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  emptyCard: { alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 20, borderWidth: 2, borderColor: colors.border, padding: 30 },
  emptyText: { color: colors.muted, fontWeight: '600' },
  loanCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 2, borderColor: colors.border, borderBottomWidth: 4 },
  loanTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coin: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#e9f9e0', alignItems: 'center', justifyContent: 'center' },
  loanAmount: { fontSize: 23, fontWeight: '800', color: colors.text },
  code: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 1 },
  progressWrap: { height: 12, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  progressBar: { height: 12, backgroundColor: colors.primary, borderRadius: 999 },
  paidLine: { fontSize: 13, color: colors.muted, fontWeight: '700', marginTop: -6 },
  metaRow: { flexDirection: 'row', gap: 8, borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 12 },
  meta: { flex: 1 },
  metaLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  metaValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },
  loanFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  freqPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  freqText: { fontSize: 13, fontWeight: '800', color: colors.accentText },
  footDate: { fontSize: 13, color: colors.muted, fontWeight: '700' },
  newLoanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16,
    borderBottomWidth: 4, borderBottomColor: colors.primaryDark, marginTop: 4,
  },
  newLoanText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
});
