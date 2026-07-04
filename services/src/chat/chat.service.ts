import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../realtime/events.gateway';
import { MessagesQueryInput, SendMessageInput } from './chat.models';
import { AuthContext } from '../common/types';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  /** Historial descendente (más recientes primero) con cursor opcional `before`. */
  async list(tenantId: string, query: MessagesQueryInput) {
    const take = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const rows = await this.prisma.forTenant(tenantId).message.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      ...(query.before ? { cursor: { id: query.before }, skip: 1 } : {}),
    });
    return rows;
  }

  async send(user: AuthContext, input: SendMessageInput) {
    const body = input.body.trim();
    if (!body) throw new Error('Mensaje vacío');

    // El nombre del autor no viaja en el JWT; se resuelve del usuario.
    const author = await this.prisma
      .forTenant(user.tenantId)
      .user.findFirst({ where: { id: user.userId }, select: { fullName: true } });

    const message = await this.prisma.forTenant(user.tenantId).message.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        authorName: author?.fullName ?? user.email,
        body,
      },
    });

    // Fan-out en tiempo real a todos los conectados del tenant.
    this.events.emitToTenant(user.tenantId, 'message.created', message);
    return message;
  }
}
