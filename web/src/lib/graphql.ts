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

export interface Client {
  id: string;
  fullName: string;
  documentId?: string;
  phone?: string;
  address?: string;
  city?: string;
}

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

export function fetchClients() {
  return gql<{ clients: Client[] }>(`{ clients { id fullName documentId phone address city } }`);
}

export function createClient(input: {
  fullName: string;
  documentId?: string;
  phone?: string;
  address?: string;
  city?: string;
}) {
  return gql<{ createClient: Client }>(
    `mutation($i: CreateClientInput!) {
      createClient(input: $i) { id fullName documentId phone address city }
    }`,
    { i: input },
  );
}

export function updateClient(input: {
  id: string;
  fullName?: string;
  documentId?: string;
  phone?: string;
  address?: string;
  city?: string;
}) {
  return gql<{ updateClient: Client }>(
    `mutation($i: UpdateClientInput!) {
      updateClient(input: $i) { id fullName documentId phone address city }
    }`,
    { i: input },
  );
}

export function deleteClient(id: string) {
  return gql<{ deleteClient: { id: string } }>(
    `mutation($id: ID!) { deleteClient(id: $id) { id } }`,
    { id },
  );
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
