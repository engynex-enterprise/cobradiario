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
  city?: string;
}

export interface Product {
  id: string;
  name: string;
  interestMethod: string;
  interestRate: number;
  termCount: number;
  frequency: string;
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
  return gql<{ clients: Client[] }>(`{ clients { id fullName documentId phone city } }`);
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
      createClient(input: $i) { id fullName documentId phone city }
    }`,
    { i: input },
  );
}

export function fetchProducts() {
  return gql<{ creditProducts: Product[] }>(
    `{ creditProducts { id name interestMethod interestRate termCount frequency } }`,
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

export function createLoan(input: {
  clientId: string;
  productId: string;
  principal: number;
  routeId?: string;
}) {
  return gql<{ createLoan: Loan }>(
    `mutation($i: CreateLoanInput!) {
      createLoan(input: $i) { id status principal totalDue paidAmount balance clientId createdAt }
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
  lateFee: number;
  paidAmount: number;
}

export interface LoanDetail extends Loan {
  interestTotal: number;
  installments: Installment[];
}

export function fetchLoanDetail(id: string) {
  return gql<{ loan: LoanDetail }>(
    `query($id: ID!) {
      loan(id: $id) {
        id status principal interestTotal totalDue paidAmount balance clientId clientName routeName createdAt
        installments { id sequence status dueDate amount principalPart interestPart lateFee paidAmount }
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
