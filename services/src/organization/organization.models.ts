import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

@ObjectType('Organization')
export class OrganizationModel {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() type!: string;
  @Field(() => Int, { defaultValue: 0 }) memberCount!: number;
  @Field() createdAt!: Date;
}

@ObjectType('OrgMember')
export class OrgMemberModel {
  @Field(() => ID) id!: string;
  @Field() fullName!: string;
  @Field() email!: string;
  @Field(() => UserRole) role!: UserRole;
  @Field() isActive!: boolean;
  @Field() createdAt!: Date;
}

@ObjectType('OrgInvitation')
export class OrgInvitationModel {
  @Field(() => ID) id!: string;
  @Field() email!: string;
  @Field(() => UserRole) role!: UserRole;
  @Field() status!: string;
  @Field({ nullable: true }) invitedByName?: string;
  @Field() expiresAt!: Date;
  @Field() createdAt!: Date;
}
