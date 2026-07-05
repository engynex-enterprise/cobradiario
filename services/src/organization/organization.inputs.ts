import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdateOrganizationInput {
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(120) name?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(40) legalId?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(2) countryCode?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(5) language?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @MaxLength(60) timezone?: string;
  // Políticas de crédito y caja
  @Field({ nullable: true }) @IsOptional() @IsString() defaultProductId?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsNumber() graceDays?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsNumber() installmentRounding?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() minLoanAmount?: number;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() maxLoanAmount?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsNumber() moraRunHour?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsNumber() reminderRunHour?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() requireBaseOnCashOpen?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() collectorCanCreateLoan?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() collectorCanEditInstallment?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() collectorCanDiscount?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() collectorCanWaiveLateFee?: boolean;
  // Notificaciones
  @Field({ nullable: true }) @IsOptional() @IsBoolean() notifyPaymentReceived?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() notifyOverdue?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() notifyNewLoan?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() notifyDailySummary?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() notifyChannelEmail?: boolean;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() notifyChannelPush?: boolean;
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
