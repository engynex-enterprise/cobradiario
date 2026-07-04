import { Field, ID, ObjectType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
// UserRole ya se registra como enum GraphQL en auth/dto/auth.models.ts

@ObjectType('TeamMember')
export class TeamMemberModel {
  @Field(() => ID) id!: string;
  @Field() fullName!: string;
  @Field() email!: string;
  @Field(() => UserRole) role!: UserRole;
  @Field() isActive!: boolean;
}
