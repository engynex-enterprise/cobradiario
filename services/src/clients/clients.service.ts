import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateClientInput, UpdateClientInput, CreateGuarantorInput, UpdateGuarantorInput,
} from './clients.inputs';
import { ClientModel, ClientGuarantorModel } from './clients.models';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<ClientModel[]> {
    const db = this.prisma.forTenant(tenantId);
    const rows = await db.client.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: 'asc' },
      include: { guarantors: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
      take: 200,
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
    const updated = await db.client.update({
      where: { id },
      data,
      include: { guarantors: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    });
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

  // ---- Fiadores ----

  async addGuarantor(tenantId: string, input: CreateGuarantorInput): Promise<ClientGuarantorModel> {
    const { clientId, ...data } = input;
    const db = this.prisma.forTenant(tenantId);
    await db.client.findFirstOrThrow({ where: { id: clientId, deletedAt: null } });
    const created = await db.guarantor.create({ data: { tenantId, clientId, ...data } });
    return toGuarantorModel(created);
  }

  async updateGuarantor(tenantId: string, input: UpdateGuarantorInput): Promise<ClientGuarantorModel> {
    const { id, ...data } = input;
    const db = this.prisma.forTenant(tenantId);
    await db.guarantor.findFirstOrThrow({ where: { id, deletedAt: null } });
    const updated = await db.guarantor.update({ where: { id }, data });
    return toGuarantorModel(updated);
  }

  async removeGuarantor(tenantId: string, id: string): Promise<string> {
    const db = this.prisma.forTenant(tenantId);
    await db.guarantor.findFirstOrThrow({ where: { id, deletedAt: null } });
    await db.guarantor.update({ where: { id }, data: { deletedAt: new Date() } });
    return id;
  }
}

function toGuarantorModel(g: Prisma.GuarantorGetPayload<object>): ClientGuarantorModel {
  return {
    id: g.id,
    fullName: g.fullName,
    documentId: g.documentId ?? undefined,
    phone: g.phone ?? undefined,
    address: g.address ?? undefined,
    relationship: g.relationship ?? undefined,
    notes: g.notes ?? undefined,
  };
}

function toClientModel(
  c: Prisma.ClientGetPayload<{ include: { guarantors: true } }> | Prisma.ClientGetPayload<object>,
  stats?: { loansCount: number; activeLoans: number; totalBalance: number },
): ClientModel {
  const guarantors = 'guarantors' in c && Array.isArray(c.guarantors) ? c.guarantors.map(toGuarantorModel) : [];
  return {
    id: c.id,
    fullName: c.fullName,
    documentId: c.documentId ?? undefined,
    documentType: c.documentType ?? undefined,
    phone: c.phone ?? undefined,
    phone2: c.phone2 ?? undefined,
    email: c.email ?? undefined,
    address: c.address ?? undefined,
    neighborhood: c.neighborhood ?? undefined,
    city: c.city ?? undefined,
    occupation: c.occupation ?? undefined,
    birthDate: c.birthDate ?? undefined,
    latitude: c.latitude ?? undefined,
    longitude: c.longitude ?? undefined,
    notes: c.notes ?? undefined,
    createdAt: c.createdAt,
    loansCount: stats?.loansCount ?? 0,
    activeLoans: stats?.activeLoans ?? 0,
    totalBalance: stats?.totalBalance ?? 0,
    guarantors,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
