import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * E2E del backend contra la app real (GraphQL sobre HTTP) y Postgres con RLS.
 * Consolida en CI la verificación manual: auth, aislamiento multi-tenant, ciclo de crédito,
 * idempotencia de abonos y arqueo de caja.
 */
let app: INestApplication;
let baseUrl: string;

const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface GqlResponse<T = any> {
  data?: T;
  errors?: { message: string }[];
}

async function gql<T = any>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): Promise<GqlResponse<T>> {
  const res = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<GqlResponse<T>>;
}

async function registerTenant(name: string) {
  const email = `${name.replace(/\s+/g, '').toLowerCase()}-${uniq()}@test.com`;
  const res = await gql<{ register: { accessToken: string; user: { tenantId: string; role: string; email: string } } }>(
    `mutation($i: RegisterInput!) {
      register(input: $i) { accessToken user { tenantId email role } }
    }`,
    { i: { tenantName: name, tenantType: 'ORGANIZATION', fullName: name, email, password: 'Password123' } },
  );
  if (!res.data?.register) {
    throw new Error(`register falló: ${JSON.stringify(res.errors)}`);
  }
  return { token: res.data.register.accessToken, email, res };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
  );
  await app.init();
  await app.listen(0);
  baseUrl = await app.getUrl();
}, 40000);

afterAll(async () => {
  await app?.close();
});

describe('Auth', () => {
  it('registra un tenant y devuelve token + usuario OWNER', async () => {
    const { res } = await registerTenant('Auth Co');
    expect(res.data?.register.accessToken).toBeTruthy();
    expect(res.data?.register.user.role).toBe('OWNER');
  });

  it('login válido y query me; credenciales inválidas fallan', async () => {
    const { email } = await registerTenant('Login Co');
    const ok = await gql(`mutation($i:LoginInput!){ login(input:$i){ accessToken } }`, {
      i: { email, password: 'Password123' },
    });
    expect(ok.data?.login.accessToken).toBeTruthy();

    const me = await gql(`{ me { email role } }`, {}, ok.data!.login.accessToken);
    expect(me.data?.me.email).toBe(email);

    const bad = await gql(`mutation($i:LoginInput!){ login(input:$i){ accessToken } }`, {
      i: { email, password: 'wrong' },
    });
    expect(bad.errors?.[0].message).toMatch(/inválidas/i);
  });

  it('rechaza queries sin token', async () => {
    const res = await gql(`{ me { id } }`);
    expect(res.errors?.[0].message).toMatch(/unauthorized/i);
  });
});

describe('Aislamiento multi-tenant (RLS)', () => {
  it('un tenant no ve los datos de otro', async () => {
    const a = await registerTenant('Tenant A');
    const b = await registerTenant('Tenant B');

    await gql(`mutation{ createClient(input:{fullName:"Cliente A"}){ id } }`, {}, a.token);

    const aSees = await gql<{ clients: unknown[] }>(`{ clients { fullName } }`, {}, a.token);
    const bSees = await gql<{ clients: unknown[] }>(`{ clients { fullName } }`, {}, b.token);

    expect(aSees.data?.clients).toHaveLength(1);
    expect(bSees.data?.clients).toHaveLength(0);
  });
});

describe('Ciclo de crédito y abonos', () => {
  it('crea producto+cliente+crédito, aplica abono y es idempotente', async () => {
    const { token } = await registerTenant('Loan Co');

    const product = await gql<{ createCreditProduct: { id: string } }>(
      `mutation($i:CreateProductInput!){ createCreditProduct(input:$i){ id } }`,
      { i: { name: 'Diario 20/20', interestRate: 0.2, termCount: 20 } },
      token,
    );
    const client = await gql<{ createClient: { id: string } }>(
      `mutation{ createClient(input:{fullName:"Deudor"}){ id } }`,
      {},
      token,
    );

    const loan = await gql<{ createLoan: { id: string; totalDue: number; balance: number } }>(
      `mutation($i:CreateLoanInput!){ createLoan(input:$i){ id totalDue balance } }`,
      { i: { clientId: client.data!.createClient.id, productId: product.data!.createCreditProduct.id, principal: 100000 } },
      token,
    );
    expect(loan.data?.createLoan.totalDue).toBe(120000);

    const loanId = loan.data!.createLoan.id;
    const reqId = `e2e-${uniq()}`;
    const pay = await gql<{ registerPayment: { applied: number; loan: { balance: number } } }>(
      `mutation($i:RegisterPaymentInput!){ registerPayment(input:$i){ applied loan{ balance } } }`,
      { i: { loanId, amount: 6000, clientRequestId: reqId } },
      token,
    );
    expect(pay.data?.registerPayment.applied).toBe(6000);
    expect(pay.data?.registerPayment.loan.balance).toBe(114000);

    // Idempotencia: reenviar la misma clave no vuelve a descontar.
    const dup = await gql<{ registerPayment: { loan: { balance: number } } }>(
      `mutation($i:RegisterPaymentInput!){ registerPayment(input:$i){ loan{ balance } } }`,
      { i: { loanId, amount: 6000, clientRequestId: reqId } },
      token,
    );
    expect(dup.data?.registerPayment.loan.balance).toBe(114000);
  });
});

describe('Arqueo de caja', () => {
  it('abre caja, el abono entra como COLLECTION y el cierre calcula el descuadre', async () => {
    const { token } = await registerTenant('Caja Co');
    const product = await gql<{ createCreditProduct: { id: string } }>(
      `mutation($i:CreateProductInput!){ createCreditProduct(input:$i){ id } }`,
      { i: { name: 'P', interestRate: 0.2, termCount: 20 } },
      token,
    );
    const client = await gql<{ createClient: { id: string } }>(
      `mutation{ createClient(input:{fullName:"D"}){ id } }`, {}, token,
    );
    const loan = await gql<{ createLoan: { id: string } }>(
      `mutation($i:CreateLoanInput!){ createLoan(input:$i){ id } }`,
      { i: { clientId: client.data!.createClient.id, productId: product.data!.createCreditProduct.id, principal: 100000 } },
      token,
    );

    await gql(`mutation{ openCashBox(input:{openingBalance:50000}){ id } }`, {}, token);
    await gql(
      `mutation($i:RegisterPaymentInput!){ registerPayment(input:$i){ applied } }`,
      { i: { loanId: loan.data!.createLoan.id, amount: 6000, clientRequestId: `c-${uniq()}` } },
      token,
    );

    const box = await gql<{ myOpenCashBox: { expectedBalance: number; collectionsTotal: number } }>(
      `{ myOpenCashBox { expectedBalance collectionsTotal } }`, {}, token,
    );
    expect(box.data?.myOpenCashBox.collectionsTotal).toBe(6000);
    expect(box.data?.myOpenCashBox.expectedBalance).toBe(56000);

    const close = await gql<{ closeCashBox: { difference: number; isOpen: boolean } }>(
      `mutation{ closeCashBox(input:{countedBalance:55500}){ difference isOpen } }`, {}, token,
    );
    expect(close.data?.closeCashBox.isOpen).toBe(false);
    expect(close.data?.closeCashBox.difference).toBe(-500);
  });
});
