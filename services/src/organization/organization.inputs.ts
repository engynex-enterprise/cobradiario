import { Field, ID, InputType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdateOrganizationInput {
  @Field()
  @IsString()
  @MaxLength(120)
  name!: string;
}

@InputType()
export class InviteMemberInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field(() => UserRole)
  @IsEnum(UserRole)
  role!: UserRole;
}

@InputType()
export class UpdateMemberRoleInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => UserRole)
  @IsEnum(UserRole)
  role!: UserRole;
}

@InputType()
export class AcceptInvitationInput {
  @Field()
  @IsString()
  token!: string;

  @Field()
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
