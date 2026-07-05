import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientInput, UpdateClientInput } from './clients.inputs';
import { ClientModel } from './clients.models';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<ClientModel[]> {
    const db = this.prisma.forTenant(tenantId);
    const rows = await db.client.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: 'asc' },
      take: 100,
    });

    // Agregados de cartera por cliente (créditos, activos y saldo pendiente).
    const [byClient, activeByClient] = await Promise.all([
      db.loan.groupBy({
        by: ['clientId'],
        where: { deletedAt: null },
        _count: true,
        _sum: { balance: true },
      }),
      db.loan.groupBy({
        by: ['clientId'],
        where: { deletedAt: null, status: { in: ['ACTIVE', 'DEFAULTED'] } },
        _count: true,
      }),
    ]);
    const totals = new Map(byClient.map((g) => [g.clientId, { count: g._count, balance: Number(g._sum.balance ?? 0) }]));
    const actives = new Map(activeByClient.map((g) => [g.clientId, g._count]));

    return rows.map((c) =>
      toClientModel(c, {
        loansCount: totals.get(c.id)?.count ?? 0,
        activeLoans: actives.get(c.id) ?? 0,
        totalBalance: round2(totals.get(c.id)?.balance ?? 0),
      }),
    );
  }

  async create(tenantId: string, input: CreateClientInput): Promise<ClientModel> {
    const created = await this.prisma.forTenant(tenantId).client.create({
      data: { tenantId, ...input },
    });
    return toClientModel(created);
  }

  async update(tenantId: string, input: UpdateClientInput): Promise<ClientModel> {
    const { id, ...data } = input;
    const db = this.prisma.forTenant(tenantId);
    await db.client.findFirstOrThrow({ where: { id, deletedAt: null } });
    const updated = await db.client.update({ where: { id }, data });
    return toClientModel(updated);
  }

  async remove(tenantId: string, id: string): Promise<ClientModel> {
    const db = this.prisma.forTenant(tenantId);
    const client = await db.client.findFirstOrThrow({ where: { id, deletedAt: null } });
    const activeLoans = await db.loan.count({
      where: { clientId: id, status: { in: ['ACTIVE', 'DEFAULTED', 'PENDING_APPROVAL'] } },
    });
    if (activeLoans > 0) {
      throw new BadRequestException('No se puede eliminar: el cliente tiene créditos activos.');
    }
    await db.client.update({ where: { id }, data: { deletedAt: new Date() } });
    return toClientModel(client);
  }
}

function toClientModel(
  c: Prisma.ClientGetPayload<object>,
  stats?: { loansCount: number; activeLoans: number; totalBalance: number },
): ClientModel {
  return {
    id: c.id,
    fullName: c.fullName,
    documentId: c.documentId ?? undefined,
    phone: c.phone ?? undefined,
    address: c.address ?? undefined,
    city: c.city ?? undefined,
    createdAt: c.createdAt,
    loansCount: stats?.loansCount ?? 0,
    activeLoans: stats?.activeLoans ?? 0,
    totalBalance: stats?.totalBalance ?? 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
