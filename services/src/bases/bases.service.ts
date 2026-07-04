import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BaseMovementModel, CreateBaseMovementInput } from './bases.models';
import { AuthContext } from '../common/types';

@Injectable()
export class BasesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, from?: Date, to?: Date): Promise<BaseMovementModel[]> {
    const where: Prisma.BaseMovementWhereInput = {};
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
    const rows = await this.prisma.forTenant(tenantId).baseMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map(toModel);
  }

  async create(user: AuthContext, input: CreateBaseMovementInput): Promise<BaseMovementModel> {
    const db = this.prisma.forTenant(user.tenantId);
    const author = await db.user.findFirst({ where: { id: user.userId }, select: { fullName: true } });
    const created = await db.baseMovement.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        authorName: author?.fullName ?? user.email,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
      },
    });
    return toModel(created);
  }
}

function toModel(b: Prisma.BaseMovementGetPayload<object>): BaseMovementModel {
  return {
    id: b.id,
    authorName: b.authorName,
    type: b.type,
    amount: Number(b.amount),
    note: b.note ?? undefined,
    createdAt: b.createdAt,
  };
}
