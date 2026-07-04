import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  createManagement,
  fetchLoanDetail,
  fetchManagements,
  fetchPayments,
  updateInstallment,
  type Installment,
  type LoanDetail,
  type Management,
  type Payment,
} from '@/lib/graphql';
import { enqueuePayment, flushQueue, pendingCount } from '@/lib/offline-queue';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';
import { AbonoModal } from '@/components/abono-modal';
import { GestionModal, type GestionInput } from '@/components/gestion-modal';

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diario', WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual', CUSTOM: 'Personalizado',
};
const METHOD_LABEL: Record<string, string> = {
  FLAT: 'Interés al capital', DECLINING_BALANCE: 'Saldo decreciente', CUSTOM: 'Personalizado',
};
const MGMT_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  CALL: { label: 'Llamada', icon: 'call', color: '#22c55e' },
  VISIT: { label: 'Visita', icon: 'walk', color: '#3b82f6' },
  SMS: { label: 'SMS', icon: 'chatbubble', color: '#f97316' },
  WHATSAPP: { label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25d366' },
  EMAIL: { label: 'Correo', icon: 'mail', color: '#ef4444' },
  OTHER: { label: 'Otro', icon: 'ellipsis-horizontal', color: colors.muted },
};

type Tab = 'plan' | 'historial' | 'gestiones';
type Filter = 'PENDING' | 'PAID' | 'OVERDUE' | 'ALL';
const INST_COLOR: Record<string, string> = { PAID: colors.success, OVERDUE: colors.danger, PARTIAL: '#f59e0b', PENDING: colors.muted };

function fmtDate(iso?: string, withYear = false) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: '2-digit', month: 'short', ...(withYear ? { year: '2-digit' } : {}) }).format(new Date(iso));
}
function fmtFull(iso?: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [managements, setManagements] = useState<Management[]>([]);
  const [tab, setTab] = useState<Tab>('plan');
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [abono, setAbono] = useState(false);
  const [info, setInfo] = useState(false);
  const [menu, setMenu] = useState(false);
  const [gestion, setGestion] = useState(false);
  const [editInst, setEditInst] = useState<Installment | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    fetchLoanDetail(id).then((d) => setLoan(d.loan)).catch(() => {});
    fetchPayments(id).then((d) => setPayments(d.payments)).catch(() => {});
    fetchManagements(id).then((d) => setManagements(d.managements)).catch(() => {});
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
  async function saveGestion(input: GestionInput) {
    if (!id) return;
    setGestion(false);
    try { await createManagement({ loanId: id, ...input }); load(); } catch { /* noop */ }
  }
  async function saveInstallment(instId: string, amount: number, dueDate?: string) {
    setEditInst(null);
    try { await updateInstallment({ id: instId, amount, dueDate }); load(); }
    catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo editar la cuota'); }
  }

  const split = useMemo(() => {
    if (!loan) return { capPaid: 0, intPaid: 0 };
    const capPaid = loan.totalDue > 0 ? (loan.paidAmount * loan.principal) / loan.totalDue : 0;
    return { capPaid, intPaid: loan.paidAmount - capPaid };
  }, [loan]);

  if (!loan) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const cuota = loan.termCount && loan.termCount > 0 ? Math.round(loan.totalDue / loan.termCount) : 0;
  const pct = loan.totalDue > 0 ? Math.round((loan.paidAmount / loan.totalDue) * 100) : 0;
  const paidCount = loan.installments.filter((i) => i.status === 'PAID').length;
  const overdueCount = loan.installments.filter((i) => i.status === 'OVERDUE').length;
  const nextDue = loan.installments.find((i) => i.status !== 'PAID')?.dueDate ?? loan.firstDueDate;
  const lastDue = loan.installments[loan.installments.length - 1]?.dueDate;
  const filtered = loan.installments.filter((i) =>
    filter === 'ALL' ? true : filter === 'PAID' ? i.status === 'PAID' : filter === 'OVERDUE' ? i.status === 'OVERDUE' : i.status !== 'PAID' && i.status !== 'OVERDUE',
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Hero verde Duolingo */}
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <View style={styles.heroBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle} numberOfLines={1}>{loan.clientName ?? 'Crédito'}</Text>
          <TouchableOpacity style={styles.circleBtn} onPress={() => setMenu(true)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.heroAmount}>{money(loan.principal)}</Text>
        {loan.code ? <Text style={styles.heroCode}>#{loan.code}</Text> : null}

        <View style={styles.heroTrack}>
          <View style={[styles.heroFill, { width: `${Math.min(pct, 100)}%` }]} />
        </View>
        <Text style={styles.heroPaid}>Pagado {money(loan.paidAmount)} de {money(loan.totalDue)} · {pct}%</Text>

        <View style={styles.heroStats}>
          <HeroStat label="Interés" value={loan.interestRate != null ? `${Math.round(loan.interestRate * 100)}%` : '—'} />
          <HeroStat label="Cuota" value={money(cuota)} />
          <HeroStat label="Frecuencia" value={FREQ_LABEL[loan.frequency ?? ''] ?? '—'} />
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <HAction icon="eye-outline" label="Ver info" onPress={() => setInfo(true)} />
        <HAction icon="create-outline" label="Editar" onPress={() => Alert.alert('Próximamente', 'La edición estará disponible pronto.')} />
        <HAction icon="trash-outline" label="Eliminar" danger onPress={() => Alert.alert('Próximamente', 'La eliminación estará disponible pronto.')} />
      </View>

      {/* Tabs chunky */}
      <View style={styles.tabs}>
        <TabBtn label="Plan de pago" active={tab === 'plan'} onPress={() => setTab('plan')} />
        <TabBtn label="Historial" active={tab === 'historial'} onPress={() => setTab('historial')} />
        <TabBtn label="Gestiones" active={tab === 'gestiones'} onPress={() => setTab('gestiones')} />
      </View>

      {tab === 'plan' && (
        <>
          <View style={styles.filterRow}>
            <FilterChip label="Pendientes" color="#e0910a" bg="#fef3c7" active={filter === 'PENDING'} onPress={() => setFilter('PENDING')} />
            <FilterChip label="Pagadas" color={colors.primaryDark} bg="#e9f9e0" active={filter === 'PAID'} onPress={() => setFilter('PAID')} />
            <FilterChip label="Vencidas" color={colors.danger} bg="#ffe5e5" active={filter === 'OVERDUE'} onPress={() => setFilter('OVERDUE')} />
            <FilterChip label="Todas" color={colors.accentText} bg={colors.accent} active={filter === 'ALL'} onPress={() => setFilter('ALL')} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 110 }}>
            {filtered.length === 0 ? <Text style={styles.empty}>Sin cuotas en este filtro.</Text> : filtered.map((it) => <InstallmentCard key={it.id} it={it} onEdit={it.paidAmount === 0 ? () => setEditInst(it) : undefined} />)}
          </ScrollView>
          <FloatingBtn icon="cash-outline" label="Abonar" onPress={() => setAbono(true)} bottom={insets.bottom} />
        </>
      )}

      {tab === 'historial' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <View style={styles.abonosCard}>
            <Text style={styles.abonosTitle}>Abonos</Text>
            <AbRow label="Abono a Capital" value={money(split.capPaid)} />
            <AbRow label="Abono a Intereses" value={money(split.intPaid)} />
            <AbRow label="Abono Interés por Mora" value={money(0)} />
            <View style={styles.abDivider} />
            <AbRow label="Total de Abonos" value={money(loan.paidAmount)} strong />
            <View style={styles.abDivider} />
            <AbRow label="Deuda a Capital" value={money(loan.principal - split.capPaid)} />
            <AbRow label="Intereses por Cobrar" value={money(loan.interestTotal - split.intPaid)} />
            <AbRow label="Ganancia Total Esperada" value={money(loan.interestTotal)} />
          </View>
          {payments.length === 0 ? (
            <View style={styles.noHist}><Text style={styles.noHistText}>Este crédito aún no tiene historial de pagos</Text></View>
          ) : (
            payments.map((p) => (
              <View key={p.id} style={styles.payItem}>
                <View style={styles.payIcon}><Ionicons name="arrow-down" size={16} color={colors.primaryDark} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payAmount}>{money(p.amount)}</Text>
                  <Text style={styles.paySub}>{fmtFull(p.paidAt)}{p.note ? ` · ${p.note}` : ''}</Text>
                </View>
                <Text style={styles.payMethod}>{p.method}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {tab === 'gestiones' && (
        <>
          {managements.length === 0 ? (
            <View style={styles.gestEmpty}>
              <View style={styles.gestEmptyIcon}><Ionicons name="headset" size={40} color={colors.primary} /></View>
              <Text style={styles.gestTitle}>No hay gestiones registradas</Text>
              <Text style={styles.gestSub}>Toca “Nueva gestión” para registrar una gestión de cobranza.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 110 }}>
              {managements.map((g) => {
                const meta = MGMT_META[g.type] ?? MGMT_META.OTHER;
                return (
                  <View key={g.id} style={styles.gestCard}>
                    <View style={[styles.gestIcon, { backgroundColor: `${meta.color}18` }]}><Ionicons name={meta.icon} size={18} color={meta.color} /></View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.gestHead}>
                        <Text style={styles.gestType}>{meta.label}</Text>
                        {g.result ? <Text style={styles.gestResult}>{g.result}</Text> : null}
                      </View>
                      {g.note ? <Text style={styles.gestNote}>{g.note}</Text> : null}
                      {g.promiseDate ? <Text style={styles.gestPromise}>Promesa: {fmtFull(g.promiseDate)}{g.promiseAmount ? ` · ${money(g.promiseAmount)}` : ''}</Text> : null}
                      {g.followUpDate ? <Text style={styles.gestFollow}>Seguimiento: {fmtFull(g.followUpDate)}</Text> : null}
                      <Text style={styles.gestMeta}>{g.authorName} · {fmtFull(g.createdAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <FloatingBtn icon="add" label="Nueva gestión" onPress={() => setGestion(true)} bottom={insets.bottom} />
        </>
      )}

      {/* Modal Info */}
      <Modal visible={info} transparent animationType="fade" onRequestClose={() => setInfo(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setInfo(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>Información del crédito</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setInfo(false)}><Ionicons name="close" size={18} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <InfoRow label="ID del crédito" value={loan.code ?? '—'} />
              <InfoRow label="Fecha del crédito" value={fmtFull(loan.disbursedAt)} />
              <InfoRow label="Fecha próxima cuota" value={fmtFull(nextDue)} />
              <InfoRow label="Vencimiento del crédito" value={fmtFull(lastDue)} />
              <InfoRow label="Cuotas vencidas" value={String(overdueCount)} />
              <InfoRow label="Interés" value={loan.interestRate != null ? `${Math.round(loan.interestRate * 100)} %` : '—'} />
              <InfoRow label="Valor total intereses" value={money(loan.interestTotal)} />
              {loan.chargesTotal ? <InfoRow label="Cargos adicionales" value={money(loan.chargesTotal)} /> : null}
              <InfoRow label="Cuotas pagadas" value={`${paidCount}/${loan.termCount ?? 0}`} />
              <InfoRow label="Frecuencia de pago" value={FREQ_LABEL[loan.frequency ?? ''] ?? '—'} />
              <InfoRow label="Valor cuota" value={money(cuota)} />
              <InfoRow label="Total prestado" value={money(loan.principal)} />
              <InfoRow label="Prestado + intereses" value={money(loan.totalDue)} />
              <InfoRow label="Total abonado" value={money(loan.paidAmount)} />
              <View style={styles.infoDivider} />
              {loan.guarantor?.fullName ? (
                <>
                  <View style={styles.abDivider} />
                  <InfoRow label="Fiador" value={loan.guarantor.fullName} />
                  {loan.guarantor.documentId ? <InfoRow label="Documento fiador" value={loan.guarantor.documentId} /> : null}
                  {loan.guarantor.phone ? <InfoRow label="Teléfono fiador" value={loan.guarantor.phone} /> : null}
                  <View style={styles.abDivider} />
                </>
              ) : null}
              <InfoRow label="Deuda a Capital" value={money(loan.principal - split.capPaid)} strong />
              <InfoRow label="Intereses Pendientes" value={money(loan.interestTotal - split.intPaid)} strong />
              <InfoRow label="Saldo Total" value={money(loan.balance)} strong />
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Menú */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenu(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.menuCard}>
            <MenuItem icon="reload-outline" label="Renovar" onPress={() => { setMenu(false); Alert.alert('Próximamente'); }} />
            <MenuItem icon="checkmark-circle-outline" label="Marcar como pagado" onPress={() => { setMenu(false); Alert.alert('Próximamente'); }} />
            <MenuItem icon="calendar-outline" label="Editar fechas de vencimiento" onPress={() => { setMenu(false); Alert.alert('Próximamente'); }} />
            <View style={styles.menuDivider} />
            <MenuItem icon="print-outline" label="Imprimir plan de pagos" onPress={() => { setMenu(false); Alert.alert('Próximamente'); }} />
            <MenuItem icon="document-text-outline" label="Imprimir historial de pagos" onPress={() => { setMenu(false); Alert.alert('Próximamente'); }} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AbonoModal loan={loan} visible={abono} onClose={() => setAbono(false)} onConfirm={confirmAbono} />
      <GestionModal visible={gestion} onClose={() => setGestion(false)} onSave={saveGestion} />
      <EditInstallmentModal inst={editInst} onClose={() => setEditInst(null)} onSave={saveInstallment} />
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={styles.heroStatValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function HAction({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.hAction} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primaryDark} />
      <Text style={[styles.hActionText, danger && { color: colors.danger }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
function FilterChip({ label, color, bg, active, onPress }: { label: string; color: string; bg: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.filterChip, { backgroundColor: active ? bg : colors.card, borderColor: active ? color : colors.border }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.filterText, { color: active ? color : colors.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function FloatingBtn({ icon, label, onPress, bottom = 0 }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; bottom?: number }) {
  return (
    <View style={[styles.fabWrap, { bottom: bottom + 16 }]}>
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={onPress}>
        <Ionicons name={icon} size={20} color="#fff" />
        <Text style={styles.fabText}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}
function InstallmentCard({ it, onEdit }: { it: Installment; onEdit?: () => void }) {
  const base = it.amount + it.lateFee;
  const unpaid = Math.max(0, base - it.paidAmount);
  const ratio = base > 0 ? unpaid / base : 0;
  const saldoCap = Math.round(it.principalPart * ratio);
  const saldoInt = Math.round(it.interestPart * ratio);
  const c = INST_COLOR[it.status] ?? colors.muted;
  return (
    <View style={styles.instCard}>
      <View style={[styles.instNum, { backgroundColor: `${c}1a` }]}><Text style={[styles.instNumText, { color: c }]}>{it.sequence}</Text></View>
      <View style={styles.instBody}>
        <View style={styles.instRow}>
          <Text style={styles.instLabel}>Saldo capital</Text>
          <Text style={styles.instValue}>{money(saldoCap)}</Text>
        </View>
        <View style={styles.instRow}>
          <Text style={styles.instLabel}>Saldo interés</Text>
          <Text style={styles.instValue}>{money(saldoInt)}</Text>
        </View>
        <View style={styles.instRow}>
          <Text style={styles.instLabelStrong}>Saldo total</Text>
          <Text style={styles.instTotal}>{money(unpaid)}</Text>
        </View>
        <View style={styles.instFoot}>
          <Text style={styles.instDue}>Vence {fmtDate(it.dueDate, true)}</Text>
          <Text style={styles.instPaid}>Abonado {money(it.paidAmount)}</Text>
        </View>
      </View>
      {onEdit ? (
        <TouchableOpacity style={styles.instEdit} onPress={onEdit} hitSlop={8}>
          <Ionicons name="create-outline" size={18} color={colors.sage ?? colors.primaryDark} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EditInstallmentModal({ inst, onClose, onSave }: { inst: Installment | null; onClose: () => void; onSave: (id: string, amount: number, dueDate?: string) => void }) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState('');
  useEffect(() => {
    if (inst) {
      setAmount(Math.round(inst.amount));
      setDate(new Date(inst.dueDate).toISOString().slice(0, 10));
    }
  }, [inst]);
  if (!inst) return null;
  const nf = new Intl.NumberFormat('es-CO');
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? new Date(`${date.trim()}T12:00:00Z`).toISOString() : undefined;
  return (
    <Modal visible={!!inst} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.editCard}>
          <Text style={styles.infoTitle}>Editar cuota #{inst.sequence}</Text>
          <Text style={styles.editLabel}>Valor de la cuota</Text>
          <TextInput
            style={styles.editInput}
            keyboardType="number-pad"
            value={amount > 0 ? nf.format(amount) : ''}
            onChangeText={(t) => setAmount(Number(t.replace(/[^\d]/g, '')) || 0)}
          />
          <Text style={styles.editLabel}>Fecha de vencimiento (AAAA-MM-DD)</Text>
          <TextInput style={styles.editInput} value={date} onChangeText={setDate} placeholder="2026-07-10" placeholderTextColor={colors.muted} />
          <TouchableOpacity style={[styles.fab, { alignSelf: 'stretch', justifyContent: 'center', marginTop: 8 }, amount <= 0 && { opacity: 0.5 }]} disabled={amount <= 0} onPress={() => onSave(inst.id, amount, iso)}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.fabText}>Guardar cambios</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
function AbRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.abRow}>
      <Text style={[styles.abLabel, strong && styles.abStrong]}>{label}</Text>
      <Text style={[styles.abValue, strong && styles.abStrong]}>{value}</Text>
    </View>
  );
}
function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, strong && { fontWeight: '800', color: colors.primaryDark }]}>{value}</Text>
    </View>
  );
}
function MenuItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={colors.primaryDark} />
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 4 },
  heroBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
  heroAmount: { fontSize: 30, fontWeight: '800', color: '#fff', marginTop: 6 },
  heroCode: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  heroTrack: { height: 12, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  heroFill: { height: 12, backgroundColor: '#fff', borderRadius: 999 },
  heroPaid: { fontSize: 13, color: 'rgba(255,255,255,0.95)', fontWeight: '700', marginTop: 6 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 10 },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  heroStatValue: { fontSize: 15, color: '#fff', fontWeight: '800', marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, marginHorizontal: 16, marginTop: -14, borderRadius: 16, borderWidth: 2, borderColor: colors.border, paddingVertical: 12, borderBottomWidth: 4 },
  hAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hActionText: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: colors.card, marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 5, borderWidth: 2, borderColor: colors.border },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 12 },
  tabBtnActive: { backgroundColor: colors.primary, borderBottomWidth: 3, borderBottomColor: colors.primaryDark },
  tabText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  tabTextActive: { color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  filterChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999, borderWidth: 2 },
  filterText: { fontSize: 12, fontWeight: '800' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 20 },
  instCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 14, borderBottomWidth: 4 },
  instNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  instNumText: { fontSize: 14, fontWeight: '800' },
  instBody: { flex: 1, gap: 4 },
  instRow: { flexDirection: 'row', justifyContent: 'space-between' },
  instLabel: { fontSize: 13, color: colors.muted },
  instLabelStrong: { fontSize: 14, color: colors.text, fontWeight: '800' },
  instValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  instTotal: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  instEdit: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  editCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, gap: 8 },
  editLabel: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 4 },
  editInput: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: colors.text },
  instFoot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  instDue: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  instPaid: { fontSize: 12, color: colors.primaryDark, fontWeight: '800' },
  fabWrap: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 44, paddingVertical: 16, borderRadius: 999, borderBottomWidth: 5, borderBottomColor: colors.primaryDark },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  abonosCard: { backgroundColor: colors.primary, borderRadius: 20, padding: 18, gap: 8, borderBottomWidth: 5, borderBottomColor: colors.primaryDark },
  abonosTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  abRow: { flexDirection: 'row', justifyContent: 'space-between' },
  abLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  abValue: { fontSize: 14, color: '#fff', fontWeight: '700' },
  abStrong: { fontSize: 16, fontWeight: '800', color: '#fff' },
  abDivider: { height: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4, borderRadius: 2 },
  noHist: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 24 },
  noHistText: { textAlign: 'center', color: colors.muted, fontWeight: '600' },
  payItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 12 },
  payIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e9f9e0', alignItems: 'center', justifyContent: 'center' },
  payAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  paySub: { fontSize: 12, color: colors.muted },
  payMethod: { fontSize: 10, fontWeight: '800', color: colors.muted },
  gestEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  gestEmptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#e9f9e0', alignItems: 'center', justifyContent: 'center' },
  gestTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  gestSub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  gestCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 2, borderColor: colors.border, padding: 14, borderBottomWidth: 4 },
  gestIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  gestHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gestType: { fontSize: 15, fontWeight: '800', color: colors.text },
  gestResult: { fontSize: 12, fontWeight: '700', color: colors.primaryDark, backgroundColor: '#e9f9e0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  gestNote: { fontSize: 14, color: colors.text, marginTop: 3 },
  gestPromise: { fontSize: 13, color: '#e0910a', fontWeight: '700', marginTop: 4 },
  gestFollow: { fontSize: 13, color: colors.accentText, fontWeight: '700', marginTop: 2 },
  gestMeta: { fontSize: 11, color: colors.muted, marginTop: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  infoCard: { backgroundColor: colors.card, borderRadius: 22, padding: 18, maxHeight: '82%' },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  infoTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  infoLabel: { fontSize: 14, color: colors.text, flex: 1 },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '600', textAlign: 'right' },
  infoDivider: { height: 2, backgroundColor: colors.border, marginVertical: 6, borderRadius: 2 },
  menuCard: { backgroundColor: colors.card, borderRadius: 18, padding: 8, position: 'absolute', top: 90, right: 20, left: 60, borderWidth: 2, borderColor: colors.border },
  menuDivider: { height: 2, backgroundColor: colors.border, marginVertical: 4, borderRadius: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 14 },
  menuText: { fontSize: 16, fontWeight: '700', color: colors.text },
});
