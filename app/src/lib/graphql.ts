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
  code?: string;
  status: string;
  principal: number;
  totalDue: number;
  paidAmount: number;
  balance: number;
  clientId: string;
  clientName?: string;
  interestTotal?: number;
  termCount?: number;
  interestRate?: number;
  frequency?: string;
  firstDueDate?: string;
}

export function login(email: string, password: string) {
  return gql<{ login: { accessToken: string; refreshToken: string; user: AuthUser } }>(
    `mutation($i: LoginInput!) {
      login(input: $i) { accessToken refreshToken user { id email fullName role tenantId } }
    }`,
    { i: { email, password } },
  );
}

export function fetchLoans() {
  return gql<{ loans: Loan[] }>(
    `{ loans { id code status principal totalDue paidAmount balance clientId clientName interestTotal termCount interestRate frequency firstDueDate } }`,
  );
}

export function registerPayment(input: {
  loanId: string;
  amount: number;
  clientRequestId: string;
  latitude?: number;
  longitude?: number;
}) {
  return gql<{ registerPayment: { applied: number; leftover: number; loan: Loan } }>(
    `mutation($i: RegisterPaymentInput!) {
      registerPayment(input: $i) { applied leftover loan { id status balance paidAmount } }
    }`,
    { i: input },
  );
}

export interface DashboardStats {
  totalPortfolio: number;
  collectedToday: number;
  activeLoans: number;
  overdueInstallments: number;
}
export function fetchDashboardStats() {
  return gql<{ dashboardStats: DashboardStats }>(
    `{ dashboardStats { totalPortfolio collectedToday activeLoans overdueInstallments } }`,
  );
}

export interface Client {
  id: string;
  fullName: string;
  documentId?: string;
  phone?: string;
  city?: string;
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

export interface CreditProduct {
  id: string;
  name: string;
  interestMethod: string;
  interestRate: number;
  termCount: number;
  frequency: string;
  lateFeeType?: string;
  lateFeeValue?: number;
}
export function fetchCreditProducts() {
  return gql<{ creditProducts: CreditProduct[] }>(
    `{ creditProducts { id name interestMethod interestRate termCount frequency lateFeeType lateFeeValue } }`,
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
  productId?: string;
  routeId?: string;
  firstDueDate?: string;
}) {
  return gql<{ createLoan: Loan }>(
    `mutation($i: CreateLoanInput!) {
      createLoan(input: $i) { id status principal interestTotal totalDue paidAmount balance clientId }
    }`,
    { i: input },
  );
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  note?: string;
}
export function fetchPayments(loanId: string) {
  return gql<{ payments: Payment[] }>(
    `query($id: ID!) { payments(loanId: $id) { id amount method status paidAt note } }`,
    { id: loanId },
  );
}

export interface Management {
  id: string;
  loanId: string;
  authorName: string;
  type: string;
  result?: string;
  note?: string;
  promiseAmount?: number;
  promiseDate?: string;
  followUpDate?: string;
  followUpNote?: string;
  createdAt: string;
}
const MGMT_FIELDS = `id loanId authorName type result note promiseAmount promiseDate followUpDate followUpNote createdAt`;

export function fetchManagements(loanId: string) {
  return gql<{ managements: Management[] }>(
    `query($id: ID!) { managements(loanId: $id) { ${MGMT_FIELDS} } }`,
    { id: loanId },
  );
}

export function createManagement(input: {
  loanId: string;
  type: string;
  result?: string;
  note?: string;
  promiseAmount?: number;
  promiseDate?: string;
  followUpDate?: string;
  followUpNote?: string;
}) {
  return gql<{ createManagement: Management }>(
    `mutation($i: CreateManagementInput!) { createManagement(input: $i) { ${MGMT_FIELDS} } }`,
    { i: input },
  );
}

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

export interface FinancialSummary {
  abonos: number;
  prestamos: number;
  totalCollected: number;
  collectedCapital: number;
  collectedInterest: number;
  collectedLateFee: number;
  byMethod: { method: string; amount: number }[];
  disbursedPrincipal: number;
  disbursedInterest: number;
  disbursedTotal: number;
  expensesTotal: number;
  netProfit: number;
}
export function fetchFinancialSummary(from?: string, to?: string) {
  return gql<{ financialSummary: FinancialSummary }>(
    `query($from: DateTime, $to: DateTime) {
      financialSummary(from: $from, to: $to) {
        abonos prestamos totalCollected collectedCapital collectedInterest collectedLateFee
        byMethod { method amount }
        disbursedPrincipal disbursedInterest disbursedTotal expensesTotal netProfit
      }
    }`,
    { from, to },
  );
}

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
    `query($from: DateTime, $to: DateTime) {
      expenses(from: $from, to: $to) { id authorName category amount note createdAt }
    }`,
    { from, to },
  );
}
export function createExpense(input: { category: string; amount: number; note?: string }) {
  return gql<{ createExpense: Expense }>(
    `mutation($i: CreateExpenseInput!) {
      createExpense(input: $i) { id authorName category amount note createdAt }
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
  code?: string;
  interestTotal: number;
  clientName?: string;
  routeName?: string;
  termCount?: number;
  interestRate?: number;
  interestMethod?: string;
  frequency?: string;
  lateFeeValue?: number;
  disbursedAt?: string;
  firstDueDate?: string;
  installments: Installment[];
}
export function fetchLoanDetail(id: string) {
  return gql<{ loan: LoanDetail }>(
    `query($id: ID!) {
      loan(id: $id) {
        id code status principal interestTotal totalDue paidAmount balance clientId clientName routeName
        termCount interestRate interestMethod frequency lateFeeValue disbursedAt firstDueDate
        installments { id sequence status dueDate amount principalPart interestPart lateFee paidAmount }
      }
    }`,
    { id },
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
