import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AccessTokenPayload } from '../common/types';

/**
 * Gateway de eventos en tiempo real (Socket.IO).
 *
 * Salas: `tenant:{tenantId}` y `route:{routeId}` para fan-out dirigido.
 * Autenticación por JWT en el handshake (auth.token o header Authorization).
 *
 * Escalado horizontal: se conecta el @socket.io/redis-adapter en main.ts para
 * que múltiples instancias compartan las salas. Ver context/01-architecture.md §5.
 *
 * NOTA (Fundación): estructura base lista; los servicios de dominio emitirán eventos
 * (`payment.registered`, `loan.overdue`, …) a través de este gateway en la próxima iteración.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('missing token');

      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });

      client.data.tenantId = payload.tid;
      client.data.userId = payload.sub;
      await client.join(`tenant:${payload.tid}`);
      this.logger.debug(`WS conectado user=${payload.sub} tenant=${payload.tid}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`WS desconectado ${client.id}`);
  }

  /** API interna para que los servicios de dominio emitan eventos a un tenant. */
  emitToTenant(tenantId: string, event: string, payload: unknown): void {
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
  }

  emitToRoute(routeId: string, event: string, payload: unknown): void {
    this.server.to(`route:${routeId}`).emit(event, payload);
  }
}
