import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Servicio Prisma central. La app se conecta como `app_user` (mínimos privilegios), por lo que
 * las políticas RLS de Postgres SÍ aplican. Ver migración 20260704120000_rls_multitenant.
 *
 * Aislamiento multi-tenant en DOS capas:
 *  1. RLS (defensa fuerte): `forTenant()` fija `app.tenant_id` como GUC local a la transacción;
 *     las políticas solo permiten filas de ese tenant.
 *  2. App layer (belt): además se inyecta `tenantId` en filtros/escrituras.
 *
 * Operaciones de sistema/auth (cross-tenant o pre-tenant) usan `system()` → activa `app.bypass_rls`.
 *
 * En transacciones interactivas (`$transaction(async tx => …)`) la extensión no aplica al cliente
 * `tx`, así que el servicio debe fijar el GUC manualmente con `setTenantGuc(tx, tenantId)`.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  private static readonly TENANT_MODELS = new Set<string>([
    'User', 'Membership', 'Client', 'Route', 'RouteCollector', 'CreditProduct',
    'Loan', 'Installment', 'Payment', 'PaymentAllocation', 'CashBox', 'CashMovement',
    'LedgerEntry', 'Notification', 'DeviceToken', 'Reminder', 'AuditLog',
  ]);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida (rol de aplicación, RLS activo)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Fija el tenant en una transacción interactiva (RLS). Llamar como primera sentencia. */
  async setTenantGuc(tx: Prisma.TransactionClient, tenantId: string): Promise<void> {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
  }

  /**
   * Cliente scoped al tenant: fija `app.tenant_id` (RLS) e inyecta tenantId (belt) en cada op.
   * Cada operación corre en su propia transacción junto al set_config (local a la tx).
   */
  forTenant(tenantId: string) {
    const client = this;
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const a: Record<string, any> = (args as Record<string, any>) ?? {};

            if (model && PrismaService.TENANT_MODELS.has(model)) {
              if (
                operation === 'findFirst' || operation === 'findMany' ||
                operation === 'findFirstOrThrow' || operation === 'count' ||
                operation === 'aggregate' || operation === 'updateMany' ||
                operation === 'deleteMany'
              ) {
                a.where = { ...(a.where ?? {}), tenantId };
              } else if (operation === 'create') {
                a.data = { ...(a.data ?? {}), tenantId };
              } else if (operation === 'createMany') {
                const data = a.data;
                a.data = Array.isArray(data)
                  ? data.map((d: Record<string, any>) => ({ ...d, tenantId }))
                  : { ...(data ?? {}), tenantId };
              } else if (operation === 'upsert') {
                // No se inyecta en `where` (debe ser un localizador único); RLS igual protege.
                a.create = { ...(a.create ?? {}), tenantId };
              }
            }

            const [, result] = await client.$transaction([
              client.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`,
              query(a),
            ]);
            return result;
          },
        },
      },
    });
  }

  /** Cliente de sistema: activa `app.bypass_rls` (auth y jobs cross-tenant). Usar con cuidado. */
  system() {
    const client = this;
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await client.$transaction([
              client.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    });
  }
}
