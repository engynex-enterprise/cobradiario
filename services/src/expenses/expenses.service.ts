import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseInput, ExpenseModel } from './expenses.models';
import { AuthContext } from '../common/types';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, from?: Date, to?: Date): Promise<ExpenseModel[]> {
    const where: Prisma.ExpenseWhereInput = {};
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
    const rows = await this.prisma.forTenant(tenantId).expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map(toModel);
  }

  async create(user: AuthContext, input: CreateExpenseInput): Promise<ExpenseModel> {
    const db = this.prisma.forTenant(user.tenantId);
    const author = await db.user.findFirst({ where: { id: user.userId }, select: { fullName: true } });
    const created = await db.expense.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        authorName: author?.fullName ?? user.email,
        category: input.category.trim(),
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        routeId: input.routeId ?? null,
      },
    });
    return toModel(created);
  }
}

function toModel(e: Prisma.ExpenseGetPayload<object>): ExpenseModel {
  return {
    id: e.id,
    authorName: e.authorName,
    category: e.category,
    amount: Number(e.amount),
    note: e.note ?? undefined,
    routeId: e.routeId ?? undefined,
    createdAt: e.createdAt,
  };
}
