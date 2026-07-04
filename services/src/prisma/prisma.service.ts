import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio Prisma central. Gestiona el ciclo de vida de la conexión.
 *
 * Aislamiento multi-tenant: `forTenant(tenantId)` devuelve un cliente extendido que
 * inyecta `tenantId` en cada operación de lectura/escritura de los modelos de negocio.
 * Los resolvers NUNCA deben confiar en un tenantId enviado por el cliente; se resuelve
 * del JWT en el guard y se pasa aquí. Ver context/01-architecture.md §3.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Modelos que llevan la columna tenantId y deben filtrarse siempre.
  private static readonly TENANT_MODELS = new Set<string>([
    'User',
    'Membership',
    'Client',
    'Route',
    'RouteCollector',
    'CreditProduct',
    'Loan',
    'Installment',
    'Payment',
    'PaymentAllocation',
    'CashBox',
    'CashMovement',
    'LedgerEntry',
    'Notification',
    'DeviceToken',
    'Reminder',
    'AuditLog',
  ]);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Cliente "scoped" al tenant: filtra lecturas por tenantId y lo fija en las escrituras.
   * Defensa en capa de aplicación (RLS en Postgres se añade como segunda capa en prod).
   */
  forTenant(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!model || !PrismaService.TENANT_MODELS.has(model)) {
              return query(args);
            }

            const a: Record<string, any> = args ?? {};

            // Lecturas / updates / deletes por filtro → forzar where.tenantId
            if (
              operation === 'findFirst' ||
              operation === 'findMany' ||
              operation === 'findFirstOrThrow' ||
              operation === 'count' ||
              operation === 'aggregate' ||
              operation === 'updateMany' ||
              operation === 'deleteMany'
            ) {
              a.where = { ...(a.where ?? {}), tenantId };
            }

            // Escrituras individuales → fijar tenantId en data
            if (operation === 'create') {
              a.data = { ...(a.data ?? {}), tenantId };
            }
            if (operation === 'createMany') {
              const data = a.data;
              a.data = Array.isArray(data)
                ? data.map((d: Record<string, any>) => ({ ...d, tenantId }))
                : { ...(data ?? {}), tenantId };
            }
            if (operation === 'upsert') {
              a.where = { ...(a.where ?? {}), tenantId };
              a.create = { ...(a.create ?? {}), tenantId };
            }

            return query(a);
          },
        },
      },
    });
  }
}
