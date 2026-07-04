import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'node:path';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ClientsModule } from './clients/clients.module';
import { LoansModule } from './loans/loans.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { CashBoxModule } from './cashbox/cashbox.module';
import { RoutesModule } from './routes/routes.module';
import { TeamModule } from './team/team.module';
import { StatsModule } from './stats/stats.module';
import { OpsModule } from './ops/ops.module';
import { TagsModule } from './tags/tags.module';
import { ChatModule } from './chat/chat.module';
import { ManagementsModule } from './managements/managements.module';
import { ExpensesModule } from './expenses/expenses.module';
import { BasesModule } from './bases/bases.module';
import { GqlAuthGuard } from './common/guards/gql-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Rate limiting global (defensa ante fuerza bruta / abuso).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Colas BullMQ (Redis) para jobs: mora nocturna, recordatorios, push.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('redis.url')!);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            username: url.username || undefined,
            password: url.password || undefined,
            maxRetriesPerRequest: null, // requerido por BullMQ workers
          },
        };
      },
    }),

    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: false,
        introspection: config.get<boolean>('api.playground'),
        // Expone req/res al contexto para leer headers/ip (auth, refresh meta).
        context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
        // Subscriptions vía WebSocket (para el panel admin).
        subscriptions: { 'graphql-ws': true },
        formatError: (err) => ({
          message: err.message,
          code: err.extensions?.code,
          // Sin stack traces al cliente en producción.
        }),
      }),
    }),

    PrismaModule,
    AuthModule,
    HealthModule,
    RealtimeModule,
    ClientsModule,
    LoansModule,
    PaymentsModule,
    ProductsModule,
    NotificationsModule,
    MaintenanceModule,
    CashBoxModule,
    RoutesModule,
    TeamModule,
    StatsModule,
    OpsModule,
    TagsModule,
    ChatModule,
    ManagementsModule,
    ExpensesModule,
    BasesModule,
  ],
  providers: [
    // Orden importa: autenticación → autorización por rol → rate limit.
    { provide: APP_GUARD, useClass: GqlAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class AppModule {}
