import { Field, InputType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateTeamMemberInput {
  @Field()
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @Field(() => UserRole, { defaultValue: UserRole.COLLECTOR })
  @IsEnum(UserRole)
  role!: UserRole;
}
