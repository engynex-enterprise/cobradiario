import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../realtime/events.gateway';
import { QUEUE_PUSH, type PushJob } from '../queue/queue.constants';
import { NotificationModel } from './notifications.models';

export interface CreateNotificationInput {
  tenantId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Además de persistir + realtime, enviar push a los dispositivos del destinatario. */
  push?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    @InjectQueue(QUEUE_PUSH) private readonly pushQueue: Queue<PushJob>,
  ) {}

  /** Crea una notificación in-app, la emite en realtime y (opcional) encola push. */
  async create(input: CreateNotificationInput): Promise<NotificationModel> {
    const notif = await this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        title: input.title,
        body: input.body,
        data: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    });

    // Realtime: a un usuario concreto o a todo el tenant.
    this.events.emitToTenant(input.tenantId, 'notification', {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      userId: notif.userId,
    });

    if (input.push) {
      await this.pushQueue.add('send', {
        tenantId: input.tenantId,
        userId: input.userId ?? undefined,
        title: input.title,
        body: input.body,
        data: input.data,
      });
    }

    return toModel(notif);
  }

  async listForUser(tenantId: string, userId: string): Promise<NotificationModel[]> {
    const rows = await this.prisma.notification.findMany({
      where: { tenantId, OR: [{ userId }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(toModel);
  }

  async markRead(tenantId: string, id: string): Promise<boolean> {
    await this.prisma.notification.updateMany({
      where: { id, tenantId, readAt: null },
      data: { readAt: new Date() },
    });
    return true;
  }

  async registerDeviceToken(
    tenantId: string,
    userId: string,
    token: string,
    platform: string,
  ): Promise<boolean> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { tenantId, userId, token, platform },
      update: { userId, isActive: true },
    });
    return true;
  }

  /** Envía notificaciones push vía Expo Push API a los dispositivos del destinatario. */
  async sendPush(job: PushJob): Promise<{ sent: number }> {
    const devices = await this.prisma.deviceToken.findMany({
      where: {
        tenantId: job.tenantId,
        isActive: true,
        ...(job.userId ? { userId: job.userId } : {}),
      },
      select: { token: true },
    });
    if (devices.length === 0) return { sent: 0 };

    const messages = devices.map((d) => ({
      to: d.token,
      title: job.title,
      body: job.body,
      data: job.data ?? {},
      sound: 'default' as const,
    }));

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      return { sent: messages.length };
    } catch (e) {
      this.logger.warn(`Fallo enviando push: ${(e as Error).message}`);
      return { sent: 0 };
    }
  }
}

function toModel(n: Prisma.NotificationGetPayload<object>): NotificationModel {
  return {
    id: n.id,
    type: n.type,
    channel: n.channel,
    title: n.title,
    body: n.body,
    data: n.data ? JSON.stringify(n.data) : undefined,
    readAt: n.readAt ?? undefined,
    createdAt: n.createdAt,
  };
}
