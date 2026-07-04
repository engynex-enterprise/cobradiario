import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RouteModel } from './routes.models';
import { AssignCollectorInput, CreateRouteInput } from './routes.inputs';

type RouteWithCollectors = Prisma.RouteGetPayload<{
  include: { collectors: { include: { user: true } } };
}>;

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<RouteModel[]> {
    const rows = await this.prisma.forTenant(tenantId).route.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { collectors: { include: { user: true } } },
    });
    return rows.map(toModel);
  }

  async create(tenantId: string, input: CreateRouteInput): Promise<RouteModel> {
    const route = await this.prisma.forTenant(tenantId).route.create({
      data: { tenantId, ...input },
      include: { collectors: { include: { user: true } } },
    });
    return toModel(route);
  }

  async assignCollector(tenantId: string, input: AssignCollectorInput): Promise<RouteModel> {
    const db = this.prisma.forTenant(tenantId);
    const [route, user] = await Promise.all([
      db.route.findFirst({ where: { id: input.routeId, deletedAt: null } }),
      db.user.findFirst({ where: { id: input.userId, deletedAt: null } }),
    ]);
    if (!route) throw new NotFoundException('Ruta no encontrada');
    if (!user) throw new NotFoundException('Usuario no encontrado');

    try {
      await db.routeCollector.create({
        data: { tenantId, routeId: input.routeId, userId: input.userId },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('El cobrador ya está asignado a esta ruta');
      }
      throw e;
    }

    const updated = await db.route.findFirstOrThrow({
      where: { id: input.routeId },
      include: { collectors: { include: { user: true } } },
    });
    return toModel(updated);
  }
}

function toModel(route: RouteWithCollectors): RouteModel {
  return {
    id: route.id,
    name: route.name,
    code: route.code ?? undefined,
    zone: route.zone ?? undefined,
    isActive: route.isActive,
    collectors: route.collectors.map((c) => ({ userId: c.userId, fullName: c.user.fullName })),
  };
}
