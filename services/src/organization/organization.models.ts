import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

@ObjectType('Organization')
export class OrganizationModel {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() type!: string;
  @Field({ nullable: true }) legalId?: string;
  @Field() countryCode!: string;
  @Field() currency!: string;
  @Field() language!: string;
  @Field() timezone!: string;
  @Field(() => Int, { defaultValue: 0 }) memberCount!: number;
  @Field() createdAt!: Date;
  // Defaults de finanzas / intereses (para nuevos créditos)
  @Field(() => Float, { nullable: true }) defaultInterestRate?: number;
  @Field({ nullable: true }) defaultInterestMethod?: string;
  @Field({ nullable: true }) defaultFrequency?: string;
  @Field(() => Int, { nullable: true }) defaultTermCount?: number;
  @Field({ nullable: true }) defaultLateFeeType?: string;
  @Field(() => Float, { nullable: true }) defaultLateFeeValue?: number;
  // Notificaciones
  @Field({ defaultValue: true }) notifyPaymentReceived!: boolean;
  @Field({ defaultValue: true }) notifyOverdue!: boolean;
  @Field({ defaultValue: false }) notifyNewLoan!: boolean;
  @Field({ defaultValue: false }) notifyDailySummary!: boolean;
  @Field({ defaultValue: false }) notifyChannelEmail!: boolean;
  @Field({ defaultValue: true }) notifyChannelPush!: boolean;
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

@ObjectType('OrgAuditLog')
export class OrgAuditLogModel {
  @Field(() => ID) id!: string;
  @Field() action!: string;
  @Field() entity!: string;
  @Field({ nullable: true }) entityId?: string;
  @Field({ nullable: true }) userName?: string;
  @Field({ nullable: true }) ip?: string;
  @Field() createdAt!: Date;
}
