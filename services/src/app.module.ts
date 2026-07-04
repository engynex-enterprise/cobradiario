import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { GqlAuthGuard } from './common/guards/gql-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Rate limiting global (defensa ante fuerza bruta / abuso).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

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
  ],
  providers: [
    // Orden importa: autenticación → autorización por rol → rate limit.
    { provide: APP_GUARD, useClass: GqlAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class AppModule {}
