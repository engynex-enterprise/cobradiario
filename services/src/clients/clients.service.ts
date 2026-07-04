import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientInput } from './clients.inputs';
import { ClientModel } from './clients.models';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<ClientModel[]> {
    const rows = await this.prisma.client.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { fullName: 'asc' },
      take: 100,
    });
    return rows.map(toClientModel);
  }

  async create(tenantId: string, input: CreateClientInput): Promise<ClientModel> {
    const created = await this.prisma.client.create({
      data: { tenantId, ...input },
    });
    return toClientModel(created);
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
