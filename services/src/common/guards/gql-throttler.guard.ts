import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard consciente de GraphQL: extrae req/res del contexto GraphQL
 * (el guard base asume contexto HTTP y falla al leer req.ip en resolvers).
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    if (ctx?.req) {
      return { req: ctx.req, res: ctx.res ?? ctx.req.res };
    }
    // Fallback a HTTP (controllers REST como /health).
    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }
}
