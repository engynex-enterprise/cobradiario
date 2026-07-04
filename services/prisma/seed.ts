/**
 * Seed de datos demo para desarrollo local.
 * Ejecutar: pnpm api:seed  (o) pnpm --filter @cobradiario/api db:seed
 * Idempotente: usa upsert por claves naturales.
 */
import { PrismaClient, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// El seed es una operación de administración: usa la conexión del dueño (DIRECT_URL),
// que no está sujeta a RLS, para poder crear datos de cualquier tenant.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('Password123', 12);

  // --- Tenant demo (organización) ---
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant' },
    update: {},
    create: {
      id: 'demo-tenant',
      name: 'Créditos La Confianza',
      type: TenantType.ORGANIZATION,
      currency: 'COP',
      timezone: 'America/Bogota',
    },
  });

  // --- Usuarios: dueño + cobrador ---
  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'owner@demo.com',
      fullName: 'Dueño Demo',
      passwordHash,
      memberships: { create: { tenantId: tenant.id, role: UserRole.OWNER } },
    },
  });

  const collector = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'cobrador@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'cobrador@demo.com',
      fullName: 'Cobrador Demo',
      passwordHash,
      memberships: { create: { tenantId: tenant.id, role: UserRole.COLLECTOR } },
    },
  });

  // --- Producto de crédito "gota a gota" clásico: 20% fijo, 20 cuotas diarias ---
  const product = await prisma.creditProduct.upsert({
    where: { id: 'demo-product' },
    update: {},
    create: {
      id: 'demo-product',
      tenantId: tenant.id,
      name: 'Diario 20% / 20 cuotas',
      interestMethod: 'FLAT',
      interestRate: 0.2,
      rateBasis: 'PER_LOAN',
      frequency: 'DAILY',
      termCount: 20,
      graceDays: 0,
      lateFeeType: 'NONE',
      roundingMode: 'NEAREST',
      roundTo: 100,
    },
  });

  // --- Producto con mora diaria (para demostrar cálculo de mora) ---
  await prisma.creditProduct.upsert({
    where: { id: 'demo-product-mora' },
    update: {},
    create: {
      id: 'demo-product-mora',
      tenantId: tenant.id,
      name: 'Diario 20% con mora 1%/día',
      interestMethod: 'FLAT',
      interestRate: 0.2,
      rateBasis: 'PER_LOAN',
      frequency: 'DAILY',
      termCount: 20,
      graceDays: 0,
      lateFeeType: 'DAILY_PERCENT',
      lateFeeValue: 0.01, // 1% del saldo de la cuota por día de atraso
      roundingMode: 'NEAREST',
      roundTo: 100,
    },
  });

  // --- Ruta + asignación de cobrador ---
  const route = await prisma.route.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'R-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Ruta Centro',
      code: 'R-01',
      zone: 'Centro',
      collectors: { create: { tenantId: tenant.id, userId: collector.id } },
    },
  });

  // --- Cliente demo ---
  await prisma.client.upsert({
    where: { tenantId_documentId: { tenantId: tenant.id, documentId: '1010101010' } },
    update: {},
    create: {
      tenantId: tenant.id,
      fullName: 'María Pérez',
      documentId: '1010101010',
      phone: '3001234567',
      address: 'Calle 10 #5-20',
      city: 'Bogotá',
    },
  });

  console.log('✅ Seed completo');
  console.log('   Tenant:', tenant.name);
  console.log('   Login dueño:    owner@demo.com / Password123');
  console.log('   Login cobrador: cobrador@demo.com / Password123');
  console.log('   Producto:', product.name, '| Ruta:', route.name);
}

main()
  .catch((e) => {
    console.error('❌ Seed falló:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
