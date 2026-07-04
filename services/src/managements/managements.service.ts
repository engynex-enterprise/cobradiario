import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManagementInput, ManagementModel } from './managements.models';
import { AuthContext } from '../common/types';

@Injectable()
export class ManagementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, loanId: string): Promise<ManagementModel[]> {
    const rows = await this.prisma.forTenant(tenantId).collectionManagement.findMany({
      where: { loanId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toModel);
  }

  async create(user: AuthContext, input: CreateManagementInput): Promise<ManagementModel> {
    const db = this.prisma.forTenant(user.tenantId);
    const loan = await db.loan.findFirst({ where: { id: input.loanId, deletedAt: null } });
    if (!loan) throw new NotFoundException('Crédito no encontrado');

    const author = await db.user.findFirst({ where: { id: user.userId }, select: { fullName: true } });

    const created = await db.collectionManagement.create({
      data: {
        tenantId: user.tenantId,
        loanId: input.loanId,
        userId: user.userId,
        authorName: author?.fullName ?? user.email,
        type: input.type,
        result: input.result?.trim() || null,
        note: input.note?.trim() || null,
        promiseAmount: input.promiseAmount != null ? new Prisma.Decimal(input.promiseAmount) : null,
        promiseDate: input.promiseDate ?? null,
        followUpDate: input.followUpDate ?? null,
        followUpNote: input.followUpNote?.trim() || null,
      },
    });
    return toModel(created);
  }
}

function toModel(m: Prisma.CollectionManagementGetPayload<object>): ManagementModel {
  return {
    id: m.id,
    loanId: m.loanId,
    userId: m.userId,
    authorName: m.authorName,
    type: m.type,
    result: m.result ?? undefined,
    note: m.note ?? undefined,
    promiseAmount: m.promiseAmount != null ? Number(m.promiseAmount) : undefined,
    promiseDate: m.promiseDate ?? undefined,
    followUpDate: m.followUpDate ?? undefined,
    followUpNote: m.followUpNote ?? undefined,
    createdAt: m.createdAt,
  };
}
