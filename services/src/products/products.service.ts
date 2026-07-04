import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductModel } from './products.models';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<ProductModel[]> {
    const rows = await this.prisma.forTenant(tenantId).creditProduct.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map(toProductModel);
  }
}

function toProductModel(p: Prisma.CreditProductGetPayload<object>): ProductModel {
  return {
    id: p.id,
    name: p.name,
    interestMethod: p.interestMethod,
    interestRate: Number(p.interestRate),
    frequency: p.frequency,
    termCount: p.termCount,
  };
}
