import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagInput, UpdateTagInput } from './tags.models';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.forTenant(tenantId).tag.findMany({ orderBy: { name: 'asc' } });
  }

  create(tenantId: string, input: CreateTagInput) {
    return this.prisma.forTenant(tenantId).tag.create({
      data: { tenantId, name: input.name.trim(), color: input.color?.trim() || '#58cc02' },
    });
  }

  update(tenantId: string, input: UpdateTagInput) {
    const { id, ...rest } = input;
    const data: { name?: string; color?: string } = {};
    if (rest.name !== undefined) data.name = rest.name.trim();
    if (rest.color !== undefined) data.color = rest.color.trim();
    // `updateMany` para respetar el filtro tenantId inyectado (RLS + belt).
    return this.prisma
      .forTenant(tenantId)
      .tag.updateMany({ where: { id }, data })
      .then(() => this.prisma.forTenant(tenantId).tag.findFirst({ where: { id } }));
  }

  async remove(tenantId: string, id: string): Promise<boolean> {
    await this.prisma.forTenant(tenantId).tag.deleteMany({ where: { id } });
    return true;
  }
}
