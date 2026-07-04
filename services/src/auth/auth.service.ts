import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AccessTokenPayload } from '../common/types';
import { LoginInput, RegisterInput } from './dto/auth.inputs';
import { AuthPayload } from './dto/auth.models';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // --- Registro: crea tenant + usuario OWNER + membership en una transacción ---
  async register(input: RegisterInput, meta?: TokenMeta): Promise<AuthPayload> {
    const email = input.email.toLowerCase().trim();
    const rounds = this.config.get<number>('jwt.bcryptRounds')!;
    const passwordHash = await bcrypt.hash(input.password, rounds);

    const user = await this.prisma
      .$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name: input.tenantName, type: input.tenantType },
        });
        const createdUser = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email,
            phone: input.phone,
            fullName: input.fullName,
            passwordHash,
          },
        });
        await tx.membership.create({
          data: { tenantId: tenant.id, userId: createdUser.id, role: UserRole.OWNER },
        });
        return createdUser;
      })
      .catch((e) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('El correo ya está registrado');
        }
        throw e;
      });

    return this.issueTokens(
      { id: user.id, tenantId: user.tenantId, email, fullName: user.fullName },
      UserRole.OWNER,
      meta,
    );
  }

  // --- Login ---
  async login(input: LoginInput, meta?: TokenMeta): Promise<AuthPayload> {
    const email = input.email.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true, deletedAt: null },
      include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } } },
    });

    // Comparación en tiempo (casi) constante: hasheamos aun sin usuario para no filtrar existencia.
    const hash = user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvale';
    const ok = await bcrypt.compare(input.password, hash);
    if (!user || !ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const role = user.memberships[0]?.role ?? UserRole.VIEWER;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);

    return this.issueTokens(
      { id: user.id, tenantId: user.tenantId, email: user.email, fullName: user.fullName },
      role,
      meta,
    );
  }

  // --- Refresh con rotación + detección de reuso ---
  async refresh(rawToken: string, meta?: TokenMeta): Promise<AuthPayload> {
    let payload: { sub: string; tid: string; jti: string; fid: string };
    try {
      payload = await this.jwt.verifyAsync(rawToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    // Reuso: token ya rotado/revocado → posible robo. Revocamos toda la familia.
    if (!stored || stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: payload.fid, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sesión revocada, vuelve a iniciar sesión');
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, deletedAt: null },
      include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } } },
    });
    if (!user) throw new UnauthorizedException('Usuario no disponible');

    const role = user.memberships[0]?.role ?? UserRole.VIEWER;
    // Rota: revoca el actual y emite uno nuevo en la misma familia.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      { id: user.id, tenantId: user.tenantId, email: user.email, fullName: user.fullName },
      role,
      meta,
      stored.familyId,
    );
  }

  async logout(rawToken: string): Promise<boolean> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  }

  // ------------------------------------------------------------------ helpers
  private async issueTokens(
    user: { id: string; tenantId: string; email: string; fullName: string },
    role: UserRole,
    meta?: TokenMeta,
    familyId?: string,
  ): Promise<AuthPayload> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      tid: user.tenantId,
      role,
      email: user.email,
    };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<number>('jwt.accessTtl'),
    });

    const fid = familyId ?? randomUUID();
    const jti = randomUUID();
    const refreshTtl = this.config.get<number>('jwt.refreshTtl')!;
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, tid: user.tenantId, jti, fid },
      { secret: this.config.get<string>('jwt.refreshSecret'), expiresIn: refreshTtl },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        familyId: fid,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, tenantId: user.tenantId, email: user.email, fullName: user.fullName, role },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

export interface TokenMeta {
  userAgent?: string;
  ip?: string;
}
