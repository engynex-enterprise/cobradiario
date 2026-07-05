import { gql } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  tenantId: string;
}

export interface Loan {
  id: string;
  status: string;
  principal: number;
  totalDue: number;
  paidAmount: number;
  balance: number;
  clientId: string;
  clientName?: string;
  routeName?: string;
  createdAt: string;
}

export interface ClientGuarantor {
  id: string;
  fullName: string;
  documentId?: string;
  phone?: string;
  address?: string;
  relationship?: string;
  notes?: string;
}

export interface ClientReference {
  fullName: string;
  phone?: string;
  relationship?: string;
  notes?: string;
}

export interface Client {
  id: string;
  fullName: string;
  documentId?: string;
  documentType?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  occupation?: string;
  birthDate?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isBlacklisted?: boolean;
  createdById?: string;
  createdByName?: string;
  loansCount?: number;
  activeLoans?: number;
  paidLoans?: number;
  defaultedLoans?: number;
  totalBalance?: number;
  creditScore?: number | null;
  riskLevel?: string;
  guarantors?: ClientGuarantor[];
  references?: ClientReference[];
  // Solo presentes vía fetchClient(id) (imágenes KYC, data URLs):
  photoUrl?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieWithDocUrl?: string;
  signatureUrl?: string;
}

export interface ClientInput {
  fullName: string;
  documentId?: string;
  documentType?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  occupation?: string;
  birthDate?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  photoUrl?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieWithDocUrl?: string;
  signatureUrl?: string;
  references?: ClientReference[];
}

const CLIENT_FIELDS = `id fullName documentId documentType phone phone2 email address neighborhood city occupation birthDate latitude longitude notes isBlacklisted createdById createdByName loansCount activeLoans paidLoans defaultedLoans totalBalance creditScore riskLevel guarantors { id fullName documentId phone address relationship notes } references { fullName phone relationship notes }`;
const CLIENT_DETAIL_FIELDS = `${CLIENT_FIELDS} photoUrl documentFrontUrl documentBackUrl selfieWithDocUrl signatureUrl`;

export interface Product {
  id: string;
  name: string;
  interestMethod: string;
  interestRate: number;
  termCount: number;
  frequency: string;
  lateFeeType?: string;
  lateFeeValue?: number;
}

export function login(email: string, password: string) {
  return gql<{ login: { accessToken: string; refreshToken: string; user: AuthUser } }>(
    `mutation($i: LoginInput!) {
      login(input: $i) { accessToken refreshToken user { id email fullName role tenantId } }
    }`,
    { i: { email, password } },
  );
}

export function fetchLoans(routeId?: string) {
  return gql<{ loans: Loan[] }>(
    `query($routeId: ID) {
      loans(routeId: $routeId) {
        id status principal totalDue paidAmount balance clientId clientName routeName createdAt
      }
    }`,
    { routeId },
  );
}

/** Registro: crea tenant + usuario OWNER (sin confirmar) y envía correo de verificación. */
export function register(input: { tenantName: string; fullName: string; email: string; password: string; phone?: string }) {
  return gql<{ register: { ok: boolean; email: string; message: string } }>(
    `mutation($i: RegisterInput!) {
      register(input: $i) { ok email message }
    }`,
    { i: { ...input, tenantType: 'INDIVIDUAL' } },
  );
}

/** Confirma la cuenta con el token del correo. */
export function verifyEmail(token: string) {
  return gql<{ verifyEmail: { ok: boolean; message: string } }>(
    `mutation($t: String!) { verifyEmail(token: $t) { ok message } }`,
    { t: token },
  );
}

/** Reenvía el correo de confirmación. */
export function resendVerification(email: string) {
  return gql<{ resendVerification: { ok: boolean; message: string } }>(
    `mutation($e: String!) { resendVerification(email: $e) { ok message } }`,
    { e: email },
  );
}

/** Login híbrido con Google: valida el token de InsForge en el backend y emite nuestros JWT. */
export function loginWithGoogle(insforgeAccessToken: string) {
  return gql<{ loginWithGoogle: { accessToken: string; refreshToken: string; user: AuthUser } }>(
    `mutation($t: String!) {
      loginWithGoogle(insforgeAccessToken: $t) { accessToken refreshToken user { id email fullName role tenantId } }
    }`,
    { t: insforgeAccessToken },
  );
}

// --- Organización ---
export interface Organization {
  id: string; name: string; type: string; legalId?: string; countryCode: string; currency: string; language: string; timezone: string;
  memberCount: number; createdAt: string;
  defaultInterestRate?: number; defaultInterestMethod?: string; defaultFrequency?: string; defaultTermCount?: number; defaultLateFeeType?: string; defaultLateFeeValue?: number;
  notifyPaymentReceived: boolean; notifyOverdue: boolean; notifyNewLoan: boolean; notifyDailySummary: boolean; notifyChannelEmail: boolean; notifyChannelPush: boolean;
}
export interface OrgMember { id: string; fullName: string; email: string; role: string; isActive: boolean; createdAt: string }
export interface OrgInvitation { id: string; email: string; role: string; status: string; invitedByName?: string; expiresAt: string; createdAt: string }
export interface OrgAuditLog { id: string; action: string; entity: string; entityId?: string; userName?: string; ip?: string; createdAt: string }
export type OrgUpdate = Partial<Omit<Organization, 'id' | 'type' | 'memberCount' | 'createdAt'>>;

const ORG_FIELDS = `id name type legalId countryCode currency language timezone memberCount createdAt defaultInterestRate defaultInterestMethod defaultFrequency defaultTermCount defaultLateFeeType defaultLateFeeValue notifyPaymentReceived notifyOverdue notifyNewLoan notifyDailySummary notifyChannelEmail notifyChannelPush`;

export function fetchOrganization() {
  return gql<{ organization: Organization }>(`{ organization { ${ORG_FIELDS} } }`);
}
export function fetchOrgMembers() {
  return gql<{ organizationMembers: OrgMember[] }>(`{ organizationMembers { id fullName email role isActive createdAt } }`);
}
export function fetchPendingInvitations() {
  return gql<{ pendingInvitations: OrgInvitation[] }>(`{ pendingInvitations { id email role status invitedByName expiresAt createdAt } }`);
}
export function fetchAuditLogs() {
  return gql<{ auditLogs: OrgAuditLog[] }>(`{ auditLogs { id action entity entityId userName ip createdAt } }`);
}
export function updateOrganization(input: OrgUpdate) {
  return gql<{ updateOrganization: Organization }>(
    `mutation($i: UpdateOrganizationInput!) { updateOrganization(input: $i) { ${ORG_FIELDS} } }`,
    { i: input },
  );
}
export function inviteMember(email: string, role: string) {
  return gql<{ inviteMember: OrgInvitation }>(
    `mutation($i: InviteMemberInput!) { inviteMember(input: $i) { id email role status } }`,
    { i: { email, role } },
  );
}
export function cancelInvitation(id: string) {
  return gql<{ cancelInvitation: boolean }>(`mutation($id: ID!) { cancelInvitation(id: $id) }`, { id });
}
export function updateMemberRole(userId: string, role: string) {
  return gql<{ updateMemberRole: OrgMember[] }>(
    `mutation($i: UpdateMemberRoleInput!) { updateMemberRole(input: $i) { id fullName email role isActive createdAt } }`,
    { i: { userId, role } },
  );
}
export function removeMember(userId: string) {
  return gql<{ removeMember: OrgMember[] }>(
    `mutation($id: ID!) { removeMember(userId: $id) { id fullName email role isActive createdAt } }`,
    { id: userId },
  );
}
export function acceptInvitation(input: { token: string; fullName: string; password: string }) {
  return gql<{ acceptInvitation: { accessToken: string; refreshToken: string; user: AuthUser } }>(
    `mutation($i: AcceptInvitationInput!) {
      acceptInvitation(input: $i) { accessToken refreshToken user { id email fullName role tenantId } }
    }`,
    { i: input },
  );
}

export function fetchClients() {
  return gql<{ clients: Client[] }>(`{ clients { ${CLIENT_FIELDS} } }`);
}

export function fetchClient(id: string) {
  return gql<{ client: Client }>(
    `query($id: ID!) { client(id: $id) { ${CLIENT_DETAIL_FIELDS} } }`,
    { id },
  );
}

export function createClient(input: ClientInput) {
  return gql<{ createClient: Client }>(
    `mutation($i: CreateClientInput!) { createClient(input: $i) { ${CLIENT_FIELDS} } }`,
    { i: input },
  );
}

export function updateClient(input: Partial<ClientInput> & { id: string }) {
  return gql<{ updateClient: Client }>(
    `mutation($i: UpdateClientInput!) { updateClient(input: $i) { ${CLIENT_FIELDS} } }`,
    { i: input },
  );
}

/** Sube una imagen (data URL) a InsForge vía el backend y devuelve su URL pública. */
export function uploadImage(dataUrl: string, folder = 'misc') {
  return gql<{ uploadImage: { url: string; key: string } }>(
    `mutation($d: String!, $f: String) { uploadImage(dataUrl: $d, folder: $f) { url key } }`,
    { d: dataUrl, f: folder },
  );
}

export function deleteClient(id: string) {
  return gql<{ deleteClient: { id: string } }>(
    `mutation($id: ID!) { deleteClient(id: $id) { id } }`,
    { id },
  );
}

// --- Fiadores (a nivel de cliente) ---
const GUARANTOR_FIELDS = `id fullName documentId phone address relationship notes`;
export function addGuarantor(input: {
  clientId: string; fullName: string; documentId?: string; phone?: string; address?: string; relationship?: string; notes?: string;
}) {
  return gql<{ addGuarantor: ClientGuarantor }>(
    `mutation($i: CreateGuarantorInput!) { addGuarantor(input: $i) { ${GUARANTOR_FIELDS} } }`,
    { i: input },
  );
}
export function updateGuarantor(input: {
  id: string; fullName?: string; documentId?: string; phone?: string; address?: string; relationship?: string; notes?: string;
}) {
  return gql<{ updateGuarantor: ClientGuarantor }>(
    `mutation($i: UpdateGuarantorInput!) { updateGuarantor(input: $i) { ${GUARANTOR_FIELDS} } }`,
    { i: input },
  );
}
export function deleteGuarantor(id: string) {
  return gql<{ deleteGuarantor: string }>(`mutation($id: ID!) { deleteGuarantor(id: $id) }`, { id });
}

export function fetchProducts() {
  return gql<{ creditProducts: Product[] }>(
    `{ creditProducts { id name interestMethod interestRate termCount frequency lateFeeType lateFeeValue } }`,
  );
}

export function createCreditProduct(input: {
  name: string;
  interestMethod: string;
  interestRate: number;
  rateBasis: string;
  frequency: string;
  termCount: number;
  graceDays: number;
  lateFeeType: string;
  lateFeeValue: number;
  roundTo: number;
}) {
  return gql<{ createCreditProduct: Product }>(
    `mutation($i: CreateProductInput!) {
      createCreditProduct(input: $i) { id name interestMethod interestRate termCount frequency }
    }`,
    { i: input },
  );
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export function fetchNotifications() {
  return gql<{ myNotifications: AppNotification[] }>(
    `{ myNotifications { id type title body readAt createdAt } }`,
  );
}

export function markNotificationRead(id: string) {
  return gql<{ markNotificationRead: boolean }>(
    `mutation($id: ID!) { markNotificationRead(id: $id) }`,
    { id },
  );
}

// --- Operaciones (feeds) ---
export interface PaymentFeedItem {
  id: string;
  loanId: string;
  clientName?: string;
  amount: number;
  method: string;
  collectorName?: string;
  paidAt: string;
}
export function fetchRecentPayments() {
  return gql<{ recentPayments: PaymentFeedItem[] }>(
    `{ recentPayments { id loanId clientName amount method collectorName paidAt } }`,
  );
}

export interface DueInstallment {
  id: string;
  loanId: string;
  clientName?: string;
  routeName?: string;
  sequence: number;
  status: string;
  dueDate: string;
  amount: number;
  lateFee: number;
  paidAmount: number;
}
export function fetchDueInstallments(filter: 'TODAY' | 'OVERDUE' | 'UPCOMING') {
  return gql<{ dueInstallments: DueInstallment[] }>(
    `query($f: DueFilter!) {
      dueInstallments(filter: $f) { id loanId clientName routeName sequence status dueDate amount lateFee paidAmount }
    }`,
    { f: filter },
  );
}

export interface CashMovementFeedItem {
  id: string;
  type: string;
  amount: number;
  note?: string;
  collectorName?: string;
  createdAt: string;
}
export function fetchCashMovements(type?: string) {
  return gql<{ cashMovements: CashMovementFeedItem[] }>(
    `query($t: CashMovementType) { cashMovements(type: $t) { id type amount note collectorName createdAt } }`,
    { t: type },
  );
}

export interface ReminderItem {
  id: string;
  type: string;
  status: string;
  runAt: string;
  sentAt?: string;
}
export function fetchReminders() {
  return gql<{ reminders: ReminderItem[] }>(
    `{ reminders { id type status runAt sentAt } }`,
  );
}

export function createLoan(input: {
  clientId: string;
  principal: number;
  termCount: number;
  interestRate: number; // fracción (0.2 = 20%)
  interestMethod?: string;
  rateBasis?: string;
  frequency?: string;
  lateFeeType?: string;
  lateFeeValue?: number;
  charges?: { concept: string; amount: number }[];
  nonPayDays?: number[];
  guarantor?: { fullName: string; documentId?: string; phone?: string; address?: string };
  productId?: string;
  routeId?: string;
}) {
  return gql<{ createLoan: Loan }>(
    `mutation($i: CreateLoanInput!) {
      createLoan(input: $i) { id status principal interestTotal totalDue paidAmount balance clientId createdAt }
    }`,
    { i: input },
  );
}

export function registerPayment(input: {
  loanId: string;
  amount: number;
  clientRequestId?: string;
}) {
  return gql<{ registerPayment: { applied: number; leftover: number; loan: Loan } }>(
    `mutation($i: RegisterPaymentInput!) {
      registerPayment(input: $i) { applied leftover loan { id status balance paidAmount } }
    }`,
    { i: input },
  );
}

export type ManagementType = 'CALL' | 'VISIT' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'OTHER';
export interface Management {
  id: string;
  loanId: string;
  authorName: string;
  type: ManagementType;
  result?: string;
  note?: string;
  promiseAmount?: number;
  promiseDate?: string;
  createdAt: string;
}
export function createManagement(input: {
  loanId: string;
  type: ManagementType;
  result?: string;
  note?: string;
  promiseAmount?: number;
  promiseDate?: string;
}) {
  return gql<{ createManagement: Management }>(
    `mutation($i: CreateManagementInput!) {
      createManagement(input: $i) { id loanId authorName type result note promiseAmount promiseDate createdAt }
    }`,
    { i: input },
  );
}
export function fetchManagements(loanId: string) {
  return gql<{ managements: Management[] }>(
    `query($loanId: ID!) { managements(loanId: $loanId) { id loanId authorName type result note promiseAmount promiseDate createdAt } }`,
    { loanId },
  );
}

export interface Installment {
  id: string;
  sequence: number;
  status: string;
  dueDate: string;
  amount: number;
  principalPart: number;
  interestPart: number;
  chargePart: number;
  lateFee: number;
  paidAmount: number;
}

export interface LoanDetail extends Loan {
  interestTotal: number;
  termCount?: number;
  interestRate?: number;
  interestMethod?: string;
  frequency?: string;
  lateFeeValue?: number;
  chargesTotal?: number;
  installments: Installment[];
}

export function fetchLoanDetail(id: string) {
  return gql<{ loan: LoanDetail }>(
    `query($id: ID!) {
      loan(id: $id) {
        id status principal interestTotal totalDue paidAmount balance clientId clientName routeName createdAt
        termCount interestRate interestMethod frequency lateFeeValue chargesTotal
        installments { id sequence status dueDate amount principalPart interestPart chargePart lateFee paidAmount }
      }
    }`,
    { id },
  );
}

export interface CashMovement {
  id: string;
  type: string;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface CashBox {
  id: string;
  isOpen: boolean;
  openingBalance: number;
  collectionsTotal: number;
  expectedBalance: number;
  closingBalance?: number;
  difference?: number;
  openedAt: string;
  closedAt?: string;
  movements: CashMovement[];
}

const CASHBOX_FIELDS = `
  id isOpen openingBalance collectionsTotal expectedBalance closingBalance difference openedAt closedAt
  movements { id type amount note createdAt }
`;

export function fetchOpenCashBox() {
  return gql<{ myOpenCashBox: CashBox | null }>(`{ myOpenCashBox { ${CASHBOX_FIELDS} } }`);
}

export function openCashBox(openingBalance: number) {
  return gql<{ openCashBox: CashBox }>(
    `mutation($b: Float!) { openCashBox(input: { openingBalance: $b }) { ${CASHBOX_FIELDS} } }`,
    { b: openingBalance },
  );
}

export function addCashMovement(type: string, amount: number, note?: string) {
  return gql<{ addCashMovement: CashBox }>(
    `mutation($t: CashMovementType!, $a: Float!, $n: String) {
      addCashMovement(input: { type: $t, amount: $a, note: $n }) { ${CASHBOX_FIELDS} }
    }`,
    { t: type, a: amount, n: note },
  );
}

export function closeCashBox(countedBalance: number) {
  return gql<{ closeCashBox: CashBox }>(
    `mutation($c: Float!) { closeCashBox(input: { countedBalance: $c }) { ${CASHBOX_FIELDS} } }`,
    { c: countedBalance },
  );
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface Route {
  id: string;
  name: string;
  code?: string;
  zone?: string;
  isActive: boolean;
  collectors: { userId: string; fullName: string }[];
}

export function fetchTeam() {
  return gql<{ teamMembers: TeamMember[] }>(`{ teamMembers { id fullName email role isActive } }`);
}

export function createTeamMember(input: {
  fullName: string;
  email: string;
  password: string;
  role: string;
}) {
  return gql<{ createTeamMember: TeamMember }>(
    `mutation($i: CreateTeamMemberInput!) {
      createTeamMember(input: $i) { id fullName email role isActive }
    }`,
    { i: input },
  );
}

const ROUTE_FIELDS = `id name code zone isActive collectors { userId fullName }`;

export function fetchRoutes() {
  return gql<{ routes: Route[] }>(`{ routes { ${ROUTE_FIELDS} } }`);
}

export function createRoute(input: { name: string; code?: string; zone?: string }) {
  return gql<{ createRoute: Route }>(
    `mutation($i: CreateRouteInput!) { createRoute(input: $i) { ${ROUTE_FIELDS} } }`,
    { i: input },
  );
}

export function assignCollector(routeId: string, userId: string) {
  return gql<{ assignCollector: Route }>(
    `mutation($i: AssignCollectorInput!) { assignCollector(input: $i) { ${ROUTE_FIELDS} } }`,
    { i: { routeId, userId } },
  );
}

export interface DashboardStats {
  totalPortfolio: number;
  collectedToday: number;
  activeLoans: number;
  overdueInstallments: number;
  portfolioByStatus: { status: string; count: number; balance: number }[];
  collectionLast7Days: { date: string; amount: number }[];
}

export function fetchDashboardStats() {
  return gql<{ dashboardStats: DashboardStats }>(
    `{ dashboardStats {
      totalPortfolio collectedToday activeLoans overdueInstallments
      portfolioByStatus { status count balance }
      collectionLast7Days { date amount }
    } }`,
  );
}

// --- Balances ---
export interface CollectorBalance {
  collectorId: string;
  collectorName?: string;
  collected: number;
  payments: number;
}

export interface Balances {
  totalPrincipal: number;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  byCollector: CollectorBalance[];
}

export function fetchBalances() {
  return gql<{ balances: Balances }>(
    `{ balances {
      totalPrincipal totalDue totalPaid outstanding
      byCollector { collectorId collectorName collected payments }
    } }`,
  );
}

// --- Resumen financiero ---
export interface FinancialSummary {
  abonos: number;
  prestamos: number;
  totalCollected: number;
  collectedCapital: number;
  collectedInterest: number;
  collectedCharges: number;
  collectedLateFee: number;
  byMethod: { method: string; amount: number }[];
  disbursedPrincipal: number;
  disbursedInterest: number;
  disbursedTotal: number;
  expensesTotal: number;
  netProfit: number;
  basesReceived: number;
  basesDelivered: number;
}
export function fetchFinancialSummary(from?: string, to?: string) {
  return gql<{ financialSummary: FinancialSummary }>(
    `query($from: DateTime, $to: DateTime) {
      financialSummary(from: $from, to: $to) {
        abonos prestamos totalCollected collectedCapital collectedInterest collectedCharges collectedLateFee
        byMethod { method amount }
        disbursedPrincipal disbursedInterest disbursedTotal expensesTotal netProfit
        basesReceived basesDelivered
      }
    }`,
    { from, to },
  );
}

export interface BaseMovement {
  id: string;
  authorName: string;
  type: string;
  amount: number;
  note?: string;
  createdAt: string;
}
export function fetchBaseMovements(from?: string, to?: string) {
  return gql<{ baseMovements: BaseMovement[] }>(
    `query($from: DateTime, $to: DateTime) { baseMovements(from: $from, to: $to) { id authorName type amount note createdAt } }`,
    { from, to },
  );
}
export function createBaseMovement(input: { type: string; amount: number; note?: string }) {
  return gql<{ createBaseMovement: BaseMovement }>(
    `mutation($i: CreateBaseMovementInput!) { createBaseMovement(input: $i) { id authorName type amount note createdAt } }`,
    { i: input },
  );
}
export function deleteBaseMovement(id: string) {
  return gql<{ deleteBaseMovement: string }>(`mutation($id: ID!) { deleteBaseMovement(id: $id) }`, { id });
}

// --- Gastos ---
export interface Expense {
  id: string;
  authorName: string;
  category: string;
  amount: number;
  note?: string;
  createdAt: string;
}
export function fetchExpenses(from?: string, to?: string) {
  return gql<{ expenses: Expense[] }>(
    `query($from: DateTime, $to: DateTime) { expenses(from: $from, to: $to) { id authorName category amount note createdAt } }`,
    { from, to },
  );
}
export function createExpense(input: { category: string; amount: number; note?: string }) {
  return gql<{ createExpense: Expense }>(
    `mutation($i: CreateExpenseInput!) { createExpense(input: $i) { id authorName category amount note createdAt } }`,
    { i: input },
  );
}
export function deleteExpense(id: string) {
  return gql<{ deleteExpense: string }>(`mutation($id: ID!) { deleteExpense(id: $id) }`, { id });
}

// --- Etiquetas ---
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

const TAG_FIELDS = `id name color createdAt`;

export function fetchTags() {
  return gql<{ tags: Tag[] }>(`{ tags { ${TAG_FIELDS} } }`);
}

export function createTag(input: { name: string; color?: string }) {
  return gql<{ createTag: Tag }>(
    `mutation($i: CreateTagInput!) { createTag(input: $i) { ${TAG_FIELDS} } }`,
    { i: input },
  );
}

export function updateTag(input: { id: string; name?: string; color?: string }) {
  return gql<{ updateTag: Tag }>(
    `mutation($i: UpdateTagInput!) { updateTag(input: $i) { ${TAG_FIELDS} } }`,
    { i: input },
  );
}

export function deleteTag(id: string) {
  return gql<{ deleteTag: boolean }>(`mutation($id: ID!) { deleteTag(id: $id) }`, { id });
}

// --- Chat ---
export interface Message {
  id: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

const MESSAGE_FIELDS = `id userId authorName body createdAt`;

export function fetchMessages(limit = 50, before?: string) {
  return gql<{ messages: Message[] }>(
    `query($q: MessagesQueryInput) { messages(query: $q) { ${MESSAGE_FIELDS} } }`,
    { q: { limit, before } },
  );
}

export function sendMessage(body: string) {
  return gql<{ sendMessage: Message }>(
    `mutation($i: SendMessageInput!) { sendMessage(input: $i) { ${MESSAGE_FIELDS} } }`,
    { i: { body } },
  );
}
