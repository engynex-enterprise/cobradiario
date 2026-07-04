import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TeamMemberModel } from './team.models';
import { CreateTeamMemberInput } from './team.inputs';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async list(tenantId: string): Promise<TeamMemberModel[]> {
    const users = await this.prisma.forTenant(tenantId).user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } } },
    });
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.memberships[0]?.role ?? UserRole.VIEWER,
      isActive: u.isActive,
    }));
  }

  async create(tenantId: string, input: CreateTeamMemberInput): Promise<TeamMemberModel> {
    const email = input.email.toLowerCase().trim();
    const rounds = this.config.get<number>('jwt.bcryptRounds')!;
    const passwordHash = await bcrypt.hash(input.password, rounds);

    const user = await this.prisma
      .$transaction(async (tx) => {
        await this.prisma.setTenantGuc(tx, tenantId); // RLS
        const created = await tx.user.create({
          data: { tenantId, email, fullName: input.fullName, passwordHash },
        });
        await tx.membership.create({
          data: { tenantId, userId: created.id, role: input.role },
        });
        return created;
      })
      .catch((e) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('Ya existe un usuario con ese correo');
        }
        throw e;
      });

    return { id: user.id, fullName: user.fullName, email: user.email, role: input.role, isActive: true };
  }
}
