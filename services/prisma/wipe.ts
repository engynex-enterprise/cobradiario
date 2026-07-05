/**
 * Vacía la base de datos de negocio dejando solo el/los usuarios OWNER (admin)
 * y su tenant, para poder ingresar con una base limpia.
 *
 * Ejecutar:  npx ts-node --transpile-only prisma/wipe.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // Bypass RLS para operar sobre todos los tenants en este wipe administrativo.
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls','on',true)`);

    // Orden hijo → padre para respetar las FKs.
    await tx.paymentAllocation.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.installment.deleteMany({});
    await tx.collectionManagement.deleteMany({});
    await tx.loan.deleteMany({});
    await tx.guarantor.deleteMany({});
    await tx.cashMovement.deleteMany({});
    await tx.cashBox.deleteMany({});
    await tx.ledgerEntry.deleteMany({});
    await tx.baseMovement.deleteMany({});
    await tx.expense.deleteMany({});
    await tx.reminder.deleteMany({});
    await tx.notification.deleteMany({});
    await tx.deviceToken.deleteMany({});
    await tx.message.deleteMany({});
    await tx.tag.deleteMany({});
    await tx.routeCollector.deleteMany({});
    await tx.route.deleteMany({});
    await tx.client.deleteMany({});
    await tx.creditProduct.deleteMany({});
    await tx.auditLog.deleteMany({});

    // Usuarios: conservar solo los OWNER (rol vive en Membership).
    const ownerMs = await tx.membership.findMany({ where: { role: 'OWNER' }, select: { userId: true } });
    const keepIds = [...new Set(ownerMs.map((m) => m.userId))];
    await tx.membership.deleteMany({ where: { userId: { notIn: keepIds } } });
    const del = await tx.user.deleteMany({ where: { id: { notIn: keepIds } } });

    const left = await tx.user.findMany({ select: { email: true } });
    console.log(`Usuarios eliminados: ${del.count}`);
    console.log('Usuarios conservados:', left.map((o) => o.email).join(', '));
  }, { timeout: 60000 });
}

main()
  .then(() => console.log('✅ Base vaciada. Solo queda el admin.'))
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
