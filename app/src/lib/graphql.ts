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
    `{ loans { id status principal totalDue paidAmount balance clientId } }`,
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

export interface Installment {
  id: string;
  sequence: number;
  status: string;
  dueDate: string;
  amount: number;
  lateFee: number;
  paidAmount: number;
}
export interface LoanDetail extends Loan {
  interestTotal: number;
  clientName?: string;
  routeName?: string;
  installments: Installment[];
}
export function fetchLoanDetail(id: string) {
  return gql<{ loan: LoanDetail }>(
    `query($id: ID!) {
      loan(id: $id) {
        id status principal interestTotal totalDue paidAmount balance clientId clientName routeName
        installments { id sequence status dueDate amount lateFee paidAmount }
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
