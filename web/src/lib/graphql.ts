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
  createdAt: string;
}

export interface Client {
  id: string;
  fullName: string;
  documentId?: string;
}

export interface Product {
  id: string;
  name: string;
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

export function fetchLoans() {
  return gql<{ loans: Loan[] }>(
    `{ loans { id status principal totalDue paidAmount balance clientId createdAt } }`,
  );
}

export function fetchClients() {
  return gql<{ clients: Client[] }>(`{ clients { id fullName documentId } }`);
}

export function fetchProducts() {
  return gql<{ creditProducts: Product[] }>(
    `{ creditProducts { id name interestRate termCount frequency } }`,
  );
}

export function createLoan(input: {
  clientId: string;
  productId: string;
  principal: number;
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
