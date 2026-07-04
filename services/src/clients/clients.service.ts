import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientInput, UpdateClientInput } from './clients.inputs';
import { ClientModel } from './clients.models';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<ClientModel[]> {
    const rows = await this.prisma.forTenant(tenantId).client.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: 'asc' },
      take: 100,
    });
    return rows.map(toClientModel);
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

function toClientModel(c: Prisma.ClientGetPayload<object>): ClientModel {
  return {
    id: c.id,
    fullName: c.fullName,
    documentId: c.documentId ?? undefined,
    phone: c.phone ?? undefined,
    address: c.address ?? undefined,
    city: c.city ?? undefined,
    createdAt: c.createdAt,
  };
}
