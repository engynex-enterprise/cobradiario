import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

registerEnumType(UserRole, { name: 'UserRole' });

@ObjectType()
export class AuthUser {
  @Field()
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  email!: string;

  @Field()
  fullName!: string;

  @Field(() => UserRole)
  role!: UserRole;
}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken!: string;

  @Field()
  refreshToken!: string;

  @Field(() => AuthUser)
  user!: AuthUser;
}
