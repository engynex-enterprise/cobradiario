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
