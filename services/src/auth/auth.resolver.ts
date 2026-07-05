import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput, RefreshInput, RegisterInput, UpdateProfileInput } from './dto/auth.inputs';
import { AcceptInvitationInput } from '../organization/organization.inputs';
import { AuthPayload, AuthUser, RegisterResponse, SimpleResult } from './dto/auth.models';
import { CurrentUser, Public } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Mutation(() => RegisterResponse)
  register(@Args('input') input: RegisterInput): Promise<RegisterResponse> {
    return this.auth.register(input);
  }

  @Public()
  @Mutation(() => SimpleResult)
  verifyEmail(@Args('token') token: string): Promise<SimpleResult> {
    return this.auth.verifyEmail(token);
  }

  @Public()
  @Mutation(() => SimpleResult)
  resendVerification(@Args('email') email: string): Promise<SimpleResult> {
    return this.auth.resendVerification(email);
  }

  @Public()
  @Mutation(() => AuthPayload)
  acceptInvitation(@Args('input') input: AcceptInvitationInput, @Context() ctx: any): Promise<AuthPayload> {
    return this.auth.acceptInvitation(input, metaFrom(ctx));
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

  @Public()
  @Mutation(() => AuthPayload)
  loginWithGoogle(@Args('insforgeAccessToken') insforgeAccessToken: string, @Context() ctx: any): Promise<AuthPayload> {
    return this.auth.loginWithGoogle(insforgeAccessToken, metaFrom(ctx));
  }

  @Mutation(() => Boolean)
  logout(@Args('input') input: RefreshInput): Promise<boolean> {
    return this.auth.logout(input.refreshToken);
  }

  @Query(() => AuthUser, { name: 'me' })
  me(@CurrentUser() user: AuthContext): Promise<AuthUser> {
    return this.auth.profile(user.userId);
  }

  @Mutation(() => AuthUser, { name: 'updateProfile' })
  updateProfile(@CurrentUser() user: AuthContext, @Args('input') input: UpdateProfileInput): Promise<AuthUser> {
    return this.auth.updateProfile(user.userId, input);
  }
}

function metaFrom(ctx: any) {
  const req = ctx?.req;
  return {
    userAgent: req?.headers?.['user-agent'],
    ip: req?.ip ?? req?.socket?.remoteAddress,
  };
}
