import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchLoanDetail, type LoanDetail } from '@/lib/graphql';
import { enqueuePayment, flushQueue, pendingCount } from '@/lib/offline-queue';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';
import { AbonoModal } from '@/components/abono-modal';

const INST_COLOR: Record<string, string> = {
  PAID: colors.success,
  OVERDUE: colors.danger,
  PARTIAL: '#f59e0b',
  PENDING: colors.muted,
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [abono, setAbono] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetchLoanDetail(id).then((d) => setLoan(d.loan)).catch(() => {});
  }, [id]);
  useEffect(() => load(), [load]);

  async function confirmAbono(amount: number) {
    setAbono(false);
    if (!loan || amount <= 0) return;
    await enqueuePayment({ loanId: loan.id, amount });
    await flushQueue();
    await pendingCount();
    load();
  }

  if (!loan) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  const progress = loan.totalDue > 0 ? Math.round((loan.paidAmount / loan.totalDue) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.client}>{loan.clientName ?? 'Crédito'}</Text>
          {loan.routeName ? <Text style={styles.route}>Ruta: {loan.routeName}</Text> : null}
        </View>

        <View style={styles.summary}>
          <Cell label="Capital" value={money(loan.principal)} />
          <Cell label="Interés" value={money(loan.interestTotal)} />
          <Cell label="Total" value={money(loan.totalDue)} />
          <Cell label="Saldo" value={money(loan.balance)} accent />
        </View>

        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}% pagado</Text>

        <Text style={styles.sectionTitle}>Plan de cuotas</Text>
        <View style={styles.card}>
          {loan.installments.map((it, i) => (
            <View key={it.id} style={[styles.instRow, i < loan.installments.length - 1 && styles.instBorder]}>
              <View style={[styles.instDot, { backgroundColor: INST_COLOR[it.status] ?? colors.muted }]} />
              <Text style={styles.instSeq}>#{it.sequence}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.instAmount}>{money(it.amount)}</Text>
                <Text style={styles.instMeta}>
                  Vence {fmtDate(it.dueDate)}
                  {it.lateFee > 0 ? ` · mora ${money(it.lateFee)}` : ''}
                </Text>
              </View>
              <Text style={[styles.instStatus, { color: INST_COLOR[it.status] ?? colors.muted }]}>{it.status}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {loan.status !== 'PAID' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.payBtn} onPress={() => setAbono(true)} activeOpacity={0.85}>
            <Text style={styles.payBtnText}>Registrar abono</Text>
          </TouchableOpacity>
        </View>
      )}

      <AbonoModal loan={loan} visible={abono} onClose={() => setAbono(false)} onConfirm={confirmAbono} />
    </View>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, accent && { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  client: { fontSize: 22, fontWeight: '800', color: colors.text },
  route: { fontSize: 13, color: colors.muted, marginTop: 2 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2,
    borderColor: colors.border, padding: 12,
  },
  cellLabel: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  cellValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },
  progressWrap: { height: 10, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  progressBar: { height: 10, backgroundColor: colors.primary, borderRadius: 999 },
  progressText: { fontSize: 12, color: colors.muted, fontWeight: '700', marginTop: -6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 14 },
  instRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  instBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  instDot: { width: 8, height: 8, borderRadius: 4 },
  instSeq: { fontSize: 12, fontWeight: '800', color: colors.muted, width: 28 },
  instAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  instMeta: { fontSize: 12, color: colors.muted },
  instStatus: { fontSize: 10, fontWeight: '800' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28,
    backgroundColor: colors.card, borderTopWidth: 2, borderTopColor: colors.border,
  },
  payBtn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    borderBottomWidth: 4, borderBottomColor: colors.primaryDark,
  },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
