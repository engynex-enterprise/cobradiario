import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ServerOptions } from 'socket.io';

/**
 * Adapter de Socket.IO respaldado por Redis Pub/Sub.
 * Permite que múltiples instancias de la API compartan salas → escalado horizontal de WS.
 * Ver context/01-architecture.md §5.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    const pubClient = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: null });
    const subClient = pubClient.duplicate();
    pubClient.on('error', (e) => this.logger.error(`Redis pub error: ${e.message}`));
    subClient.on('error', (e) => this.logger.error(`Redis sub error: ${e.message}`));
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Socket.IO Redis adapter conectado');
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
