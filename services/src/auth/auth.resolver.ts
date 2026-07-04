import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput, RefreshInput, RegisterInput } from './dto/auth.inputs';
import { AuthPayload, AuthUser } from './dto/auth.models';
import { CurrentUser, Public } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Mutation(() => AuthPayload)
  register(@Args('input') input: RegisterInput, @Context() ctx: any): Promise<AuthPayload> {
    return this.auth.register(input, metaFrom(ctx));
  }

  @Public()
  @Mutation(() => AuthPayload)
  login(@Args('input') input: LoginInput, @Context() ctx: any): Promise<AuthPayload> {
    return this.auth.login(input, metaFrom(ctx));
  }

  @Public()
  @Mutation(() => AuthPayload)
  refreshToken(@Args('input') input: RefreshInput, @Context() ctx: any): Promise<AuthPayload> {
    return this.auth.refresh(input.refreshToken, metaFrom(ctx));
  }

  @Mutation(() => Boolean)
  logout(@Args('input') input: RefreshInput): Promise<boolean> {
    return this.auth.logout(input.refreshToken);
  }

  @Query(() => AuthUser, { name: 'me' })
  me(@CurrentUser() user: AuthContext): AuthUser {
    return {
      id: user.userId,
      tenantId: user.tenantId,
      email: user.email,
      fullName: '',
      role: user.role,
    };
  }
}

function metaFrom(ctx: any) {
  const req = ctx?.req;
  return {
    userAgent: req?.headers?.['user-agent'],
    ip: req?.ip ?? req?.socket?.remoteAddress,
  };
}
