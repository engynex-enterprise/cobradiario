import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  // bodyParser: false para registrar nuestros parsers con un límite mayor
  // (las fichas de cliente llevan fotos y firma como data URLs base64).
  const app = await NestFactory.create(AppModule, { bufferLogs: false, bodyParser: false });
  const config = app.get(ConfigService);

  // Límite amplio: varias imágenes KYC en base64 por petición.
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  // Seguridad HTTP. contentSecurityPolicy off para permitir el playground/introspección en dev.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  const corsOrigins = config.get<string[]>('api.corsOrigins') ?? [];
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  // Validación estricta de todos los inputs (whitelist + rechazo de campos extra).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  // WebSockets escalables vía Redis (best-effort: si Redis no está, degrada a un solo nodo).
  const redisAdapter = new RedisIoAdapter(app);
  try {
    await redisAdapter.connectToRedis(config.get<string>('redis.url')!);
    app.useWebSocketAdapter(redisAdapter);
  } catch (e) {
    logger.warn(`Redis no disponible para Socket.IO, usando adapter en memoria: ${(e as Error).message}`);
  }

  const port = config.get<number>('api.port')!;
  const host = config.get<string>('api.host')!;
  await app.listen(port, host);
  logger.log(`🚀 API en http://${host}:${port}/graphql`);
}

void bootstrap();
