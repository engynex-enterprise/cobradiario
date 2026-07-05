import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AccessTokenPayload } from '../common/types';
import { LoginInput, RegisterInput } from './dto/auth.inputs';
import { AcceptInvitationInput } from '../organization/organization.inputs';
import { AuthPayload, RegisterResponse, SimpleResult } from './dto/auth.models';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // --- Registro: crea tenant + usuario OWNER (sin confirmar) + envía correo de verificación ---
  async register(input: RegisterInput): Promise<RegisterResponse> {
    const email = input.email.toLowerCase().trim();
    const rounds = this.config.get<number>('jwt.bcryptRounds')!;
    const passwordHash = await bcrypt.hash(input.password, rounds);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma
      .$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
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
            emailVerifyTokenHash: tokenHash,
            emailVerifyExpiresAt: expires,
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

    await this.sendVerification(email, user.fullName, rawToken);
    return {
      ok: true,
      email,
      message: 'Cuenta creada. Te enviamos un correo para confirmarla.',
    };
  }

  /** Reenvía el correo de confirmación. Respuesta genérica (no filtra existencia). */
  async resendVerification(rawEmail: string): Promise<SimpleResult> {
    const email = rawEmail.toLowerCase().trim();
    const user = await this.prisma.system().user.findFirst({
      where: { email, isActive: true, deletedAt: null, emailVerifiedAt: null },
    });
    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      await this.prisma.system().user.update({
        where: { id: user.id },
        data: { emailVerifyTokenHash: this.hashToken(rawToken), emailVerifyExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      await this.sendVerification(email, user.fullName, rawToken);
    }
    return { ok: true, message: 'Si la cuenta existe y no está confirmada, te reenviamos el correo.' };
  }

  /** Confirma la cuenta con el token del correo. */
  async verifyEmail(rawToken: string): Promise<SimpleResult> {
    const tokenHash = this.hashToken(rawToken);
    const user = await this.prisma.system().user.findFirst({
      where: { emailVerifyTokenHash: tokenHash, deletedAt: null },
    });
    if (!user || !user.emailVerifyExpiresAt || user.emailVerifyExpiresAt < new Date()) {
      throw new BadRequestException('El enlace de confirmación es inválido o expiró. Solicita uno nuevo.');
    }
    await this.prisma.system().user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), emailVerifyTokenHash: null, emailVerifyExpiresAt: null },
    });
    return { ok: true, message: '¡Cuenta confirmada! Ya puedes iniciar sesión.' };
  }

  /** Acepta una invitación a una organización: crea el usuario (confirmado) + membresía y devuelve sesión. */
  async acceptInvitation(input: AcceptInvitationInput, meta?: TokenMeta): Promise<AuthPayload> {
    const invitation = await this.prisma.system().invitation.findFirst({
      where: { tokenHash: this.hashToken(input.token), status: 'PENDING' },
    });
    if (!invitation || invitation.expiresAt < new Date()) {
      throw new BadRequestException('La invitación es inválida o expiró.');
    }
    const rounds = this.config.get<number>('jwt.bcryptRounds')!;
    const passwordHash = await bcrypt.hash(input.password, rounds);

    const user = await this.prisma
      .$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
        const created = await tx.user.create({
          data: {
            tenantId: invitation.tenantId,
            email: invitation.email,
            fullName: input.fullName,
            passwordHash,
            emailVerifiedAt: new Date(), // llegó desde el correo de invitación
          },
        });
        await tx.membership.create({
          data: { tenantId: invitation.tenantId, userId: created.id, role: invitation.role },
        });
        await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED' } });
        return created;
      })
      .catch((e) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('Ya existe una cuenta con ese correo.');
        }
        throw e;
      });

    return this.issueTokens(
      { id: user.id, tenantId: user.tenantId, email: user.email, fullName: user.fullName },
      invitation.role,
      meta,
    );
  }

  private async sendVerification(email: string, fullName: string, rawToken: string): Promise<void> {
    const base = process.env.WEB_APP_URL ?? 'http://localhost:3000';
    const link = `${base}/verificar?token=${rawToken}`;
    await this.mail.sendVerification(email, fullName, link);
  }

  // --- Login ---
  async login(input: LoginInput, meta?: TokenMeta): Promise<AuthPayload> {
    const email = input.email.toLowerCase().trim();
    // Login es pre-tenant (no sabemos el tenant hasta resolver el usuario) → bypass RLS.
    const user = await this.prisma.system().user.findFirst({
      where: { email, isActive: true, deletedAt: null },
      include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } } },
    });

    // Comparación en tiempo (casi) constante: hasheamos aun sin usuario para no filtrar existencia.
    const hash = user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvale';
    const ok = await bcrypt.compare(input.password, hash);
    if (!user || !ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED: Debes confirmar tu correo antes de iniciar sesión.');
    }

    const role = user.memberships[0]?.role ?? UserRole.VIEWER;
    await this.prisma.system().user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(
      { id: user.id, tenantId: user.tenantId, email: user.email, fullName: user.fullName },
      role,
      meta,
    );
  }

  /**
   * Login con Google vía InsForge (arquitectura híbrida): el cliente hace el
   * OAuth con InsForge y nos manda su accessToken; aquí lo validamos contra
   * InsForge, resolvemos el usuario por correo y emitimos NUESTROS tokens.
   * El usuario debe existir ya (creado/invitado por un admin).
   */
  async loginWithGoogle(insforgeAccessToken: string, meta?: TokenMeta): Promise<AuthPayload> {
    const base = process.env.INSFORGE_URL;
    if (!base) throw new UnauthorizedException('InsForge no está configurado en el servidor');

    let email: string | undefined;
    try {
      const res = await fetch(`${base}/api/auth/sessions/current`, {
        headers: { Authorization: `Bearer ${insforgeAccessToken}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { user?: { email?: string }; email?: string };
        const raw = body?.user?.email ?? body?.email;
        email = raw?.toLowerCase().trim();
      }
    } catch {
      /* red/parse → se trata como no válido abajo */
    }
    if (!email) throw new UnauthorizedException('No se pudo validar la sesión de Google');

    const user = await this.prisma.system().user.findFirst({
      where: { email, isActive: true, deletedAt: null },
      include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } } },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Este correo de Google no está registrado. Pide a un administrador que cree tu usuario.',
      );
    }

    const role = user.memberships[0]?.role ?? UserRole.VIEWER;
    // Google ya verifica el correo → marcar la cuenta como confirmada.
    await this.prisma.system().user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), ...(user.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }) },
    });
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

    const user = await this.prisma.system().user.findFirst({
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

  /** Perfil completo del usuario autenticado (desde BD). */
  async profile(userId: string): Promise<{ id: string; tenantId: string; email: string; fullName: string; phone?: string; role: UserRole }> {
    const user = await this.prisma.system().user.findFirst({
      where: { id: userId },
      include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } } },
    });
    if (!user) throw new UnauthorizedException('Usuario no disponible');
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? undefined,
      role: user.memberships[0]?.role ?? UserRole.VIEWER,
    };
  }

  /** Actualiza nombre/teléfono del usuario. */
  async updateProfile(userId: string, input: { fullName?: string; phone?: string }) {
    const data: { fullName?: string; phone?: string } = {};
    if (input.fullName !== undefined) data.fullName = input.fullName.trim();
    if (input.phone !== undefined) data.phone = input.phone.trim() || null as unknown as string;
    await this.prisma.system().user.update({ where: { id: userId }, data });
    return this.profile(userId);
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
