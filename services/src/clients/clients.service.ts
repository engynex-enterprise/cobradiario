import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateClientInput, UpdateClientInput, CreateGuarantorInput, UpdateGuarantorInput, ClientReferenceInput,
} from './clients.inputs';
import { ClientModel, ClientGuarantorModel, ClientReferenceModel } from './clients.models';

/** Agregados de cartera por cliente que alimentan el score. */
interface LoanStats {
  loansCount: number;
  activeLoans: number;
  paidLoans: number;
  defaultedLoans: number;
  totalBalance: number;
}

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

    // Un solo groupBy por (cliente, estado) para derivar todos los conteos y el saldo.
    const grouped = await db.loan.groupBy({
      by: ['clientId', 'status'],
      where: { deletedAt: null },
      _count: true,
      _sum: { balance: true },
    });
    const statsByClient = new Map<string, LoanStats>();
    for (const g of grouped) {
      const s = statsByClient.get(g.clientId) ?? emptyStats();
      const count = g._count;
      s.loansCount += count;
      s.totalBalance += Number(g._sum.balance ?? 0);
      if (g.status === 'ACTIVE' || g.status === 'DEFAULTED') s.activeLoans += count;
      if (g.status === 'PAID') s.paidLoans += count;
      if (g.status === 'DEFAULTED') s.defaultedLoans += count;
      statsByClient.set(g.clientId, s);
    }

    return rows.map((c) => toClientModel(c, statsByClient.get(c.id) ?? emptyStats()));
  }

  async findOne(tenantId: string, id: string): Promise<ClientModel> {
    const db = this.prisma.forTenant(tenantId);
    const c = await db.client.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: { guarantors: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    });
    return toClientModel(c, await this.statsFor(db, id));
  }

  private async statsFor(db: ReturnType<PrismaService['forTenant']>, clientId: string): Promise<LoanStats> {
    const grouped = await db.loan.groupBy({
      by: ['status'],
      where: { deletedAt: null, clientId },
      _count: true,
      _sum: { balance: true },
    });
    const s = emptyStats();
    for (const g of grouped) {
      s.loansCount += g._count;
      s.totalBalance += Number(g._sum.balance ?? 0);
      if (g.status === 'ACTIVE' || g.status === 'DEFAULTED') s.activeLoans += g._count;
      if (g.status === 'PAID') s.paidLoans += g._count;
      if (g.status === 'DEFAULTED') s.defaultedLoans += g._count;
    }
    return s;
  }

  async create(tenantId: string, userId: string, userEmail: string, input: CreateClientInput): Promise<ClientModel> {
    const { references, ...rest } = input;
    const db = this.prisma.forTenant(tenantId);
    const author = await db.user.findFirst({ where: { id: userId }, select: { fullName: true } });
    const created = await db.client.create({
      data: {
        tenantId,
        ...rest,
        references: refsToJson(references),
        createdById: userId,
        createdByName: author?.fullName ?? userEmail,
      },
      include: { guarantors: true },
    });
    return toClientModel(created, emptyStats());
  }

  async update(tenantId: string, input: UpdateClientInput): Promise<ClientModel> {
    const { id, references, ...rest } = input;
    const db = this.prisma.forTenant(tenantId);
    await db.client.findFirstOrThrow({ where: { id, deletedAt: null } });
    const updated = await db.client.update({
      where: { id },
      data: { ...rest, ...(references !== undefined ? { references: refsToJson(references) } : {}) },
      include: { guarantors: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    });
    return toClientModel(updated, await this.statsFor(db, id));
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
    return toClientModel(client, emptyStats());
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

function emptyStats(): LoanStats {
  return { loansCount: 0, activeLoans: 0, paidLoans: 0, defaultedLoans: 0, totalBalance: 0 };
}

/**
 * Score crediticio estilo DataCrédito (rango 150–950) a partir del comportamiento
 * de pago del cliente. Mayor score = menor riesgo de no pagar.
 */
function computeScore(s: LoanStats, isBlacklisted: boolean): { creditScore: number | null; riskLevel: string } {
  if (isBlacklisted) return { creditScore: 180, riskLevel: 'HIGH' };
  if (s.loansCount === 0) return { creditScore: null, riskLevel: 'NONE' };

  let score = 700;
  score += Math.min(s.paidLoans, 8) * 25; // historial de créditos pagados (hasta +200)
  score -= s.defaultedLoans * 150; // penalización fuerte por mora
  score -= Math.round((s.defaultedLoans / s.loansCount) * 150); // proporción en mora
  score = Math.max(150, Math.min(950, score));

  const riskLevel = score >= 780 ? 'LOW' : score >= 620 ? 'MEDIUM' : 'HIGH';
  return { creditScore: score, riskLevel };
}

function refsToJson(refs?: ClientReferenceInput[]): Prisma.InputJsonValue | undefined {
  if (refs === undefined) return undefined;
  return refs.map((r) => ({
    fullName: r.fullName,
    phone: r.phone ?? null,
    relationship: r.relationship ?? null,
    notes: r.notes ?? null,
  }));
}

function parseRefs(value: Prisma.JsonValue | null | undefined): ClientReferenceModel[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const r = item as Record<string, unknown>;
    return [{
      fullName: String(r.fullName ?? ''),
      phone: r.phone != null ? String(r.phone) : undefined,
      relationship: r.relationship != null ? String(r.relationship) : undefined,
      notes: r.notes != null ? String(r.notes) : undefined,
    }];
  });
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
  stats: LoanStats,
): ClientModel {
  const guarantors = 'guarantors' in c && Array.isArray(c.guarantors) ? c.guarantors.map(toGuarantorModel) : [];
  const { creditScore: score, riskLevel } = computeScore(stats, c.isBlacklisted);
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
    createdById: c.createdById ?? undefined,
    createdByName: c.createdByName ?? undefined,
    photoUrl: c.photoUrl ?? undefined,
    documentFrontUrl: c.documentFrontUrl ?? undefined,
    documentBackUrl: c.documentBackUrl ?? undefined,
    selfieWithDocUrl: c.selfieWithDocUrl ?? undefined,
    signatureUrl: c.signatureUrl ?? undefined,
    isBlacklisted: c.isBlacklisted,
    createdAt: c.createdAt,
    loansCount: stats.loansCount,
    activeLoans: stats.activeLoans,
    paidLoans: stats.paidLoans,
    defaultedLoans: stats.defaultedLoans,
    totalBalance: round2(stats.totalBalance),
    creditScore: score ?? undefined,
    riskLevel,
    guarantors,
    references: parseRefs(c.references),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
