import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CashBoxModel, CashMovementModel } from './cashbox.models';
import { AddCashMovementInput, CloseCashBoxInput, OpenCashBoxInput } from './cashbox.inputs';

// Signo de cada tipo de movimiento sobre el saldo de caja.
const SIGN: Record<CashMovementType, number> = {
  OPENING: 1,
  COLLECTION: 1, // ingreso por cobro
  DISBURSEMENT: -1, // desembolso de crédito
  EXPENSE: -1,
  DEPOSIT: -1, // consignación (sale de la caja)
  ADJUSTMENT: 1, // el monto lleva su propio signo
  CLOSING: 0,
};

type Movement = Prisma.CashMovementGetPayload<object>;
type BoxWithMovements = Prisma.CashBoxGetPayload<{ include: { movements: true } }>;

@Injectable()
export class CashBoxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Caja abierta del cobrador (o null). */
  async myOpenCashBox(tenantId: string, userId: string): Promise<CashBoxModel | null> {
    const box = await this.prisma.cashBox.findFirst({
      where: { tenantId, userId, closedAt: null },
      include: { movements: { orderBy: { createdAt: 'asc' } } },
    });
    return box ? toModel(box) : null;
  }

  /** Abre una caja para el cobrador. Falla si ya tiene una abierta. */
  async open(tenantId: string, userId: string, input: OpenCashBoxInput): Promise<CashBoxModel> {
    const existing = await this.prisma.cashBox.findFirst({
      where: { tenantId, userId, closedAt: null },
    });
    if (existing) throw new BadRequestException('Ya tienes una caja abierta; ciérrala primero');

    const box = await this.prisma.cashBox.create({
      data: {
        tenantId,
        userId,
        routeId: input.routeId,
        openingBalance: input.openingBalance,
        movements: {
          create: {
            tenantId,
            type: CashMovementType.OPENING,
            amount: input.openingBalance,
            note: 'Apertura de caja',
          },
        },
      },
      include: { movements: { orderBy: { createdAt: 'asc' } } },
    });
    return toModel(box);
  }

  /** Agrega un movimiento manual (gasto, consignación, desembolso, ajuste). */
  async addMovement(
    tenantId: string,
    userId: string,
    input: AddCashMovementInput,
  ): Promise<CashBoxModel> {
    if (input.type === CashMovementType.COLLECTION || input.type === CashMovementType.OPENING) {
      throw new BadRequestException('Ese tipo de movimiento se genera automáticamente');
    }
    const box = await this.prisma.cashBox.findFirst({
      where: { tenantId, userId, closedAt: null },
    });
    if (!box) throw new NotFoundException('No tienes una caja abierta');

    await this.prisma.cashMovement.create({
      data: { tenantId, cashBoxId: box.id, type: input.type, amount: input.amount, note: input.note },
    });
    return this.reload(tenantId, box.id);
  }

  /** Cierra la caja: calcula esperado vs. contado y la diferencia (descuadre). */
  async close(tenantId: string, userId: string, input: CloseCashBoxInput): Promise<CashBoxModel> {
    const box = await this.prisma.cashBox.findFirst({
      where: { tenantId, userId, closedAt: null },
      include: { movements: true },
    });
    if (!box) throw new NotFoundException('No tienes una caja abierta');

    const expected = computeExpected(box.movements);
    const difference = round2(input.countedBalance - expected);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.cashMovement.create({
        data: {
          tenantId,
          cashBoxId: box.id,
          type: CashMovementType.CLOSING,
          amount: input.countedBalance,
          note: 'Cierre de caja',
        },
      }),
      this.prisma.cashBox.update({
        where: { id: box.id },
        data: {
          closingBalance: input.countedBalance,
          expectedBalance: expected,
          difference,
          closedAt: now,
        },
      }),
    ]);
    return this.reload(tenantId, box.id);
  }

  private async reload(tenantId: string, id: string): Promise<CashBoxModel> {
    const box = await this.prisma.cashBox.findFirstOrThrow({
      where: { id, tenantId },
      include: { movements: { orderBy: { createdAt: 'asc' } } },
    });
    return toModel(box);
  }
}

function computeExpected(movements: Movement[]): number {
  const total = movements.reduce(
    (acc, m) => acc + SIGN[m.type] * Number(m.amount),
    0,
  );
  return round2(total);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toModel(box: BoxWithMovements): CashBoxModel {
  const isOpen = box.closedAt === null;
  const collectionsTotal = round2(
    box.movements
      .filter((m) => m.type === 'COLLECTION')
      .reduce((s, m) => s + Number(m.amount), 0),
  );
  // Para caja abierta el esperado se calcula en vivo; para cerrada se usa el guardado.
  const expectedBalance = isOpen
    ? computeExpected(box.movements)
    : Number(box.expectedBalance ?? 0);

  return {
    id: box.id,
    isOpen,
    openingBalance: Number(box.openingBalance),
    collectionsTotal,
    expectedBalance,
    closingBalance: box.closingBalance != null ? Number(box.closingBalance) : undefined,
    difference: box.difference != null ? Number(box.difference) : undefined,
    openedAt: box.openedAt,
    closedAt: box.closedAt ?? undefined,
    movements: box.movements.map(toMovementModel),
  };
}

function toMovementModel(m: Movement): CashMovementModel {
  return {
    id: m.id,
    type: m.type,
    amount: Number(m.amount),
    note: m.note ?? undefined,
    createdAt: m.createdAt,
  };
}
