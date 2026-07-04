import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload, AuthContext } from '../common/types';

/**
 * Valida el access token y proyecta el payload a AuthContext.
 * El objeto retornado queda disponible como req.user (y vía @CurrentUser()).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
    });
  }

  validate(payload: AccessTokenPayload): AuthContext {
    if (!payload?.sub || !payload?.tid) {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      userId: payload.sub,
      tenantId: payload.tid,
      role: payload.role,
      email: payload.email,
    };
  }
}
