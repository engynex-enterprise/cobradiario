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
  // Políticas de crédito y caja (distinto de Productos, que son plantillas)
  @Field({ nullable: true }) defaultProductId?: string;   // producto preseleccionado al crear crédito
  @Field(() => Int, { defaultValue: 0 }) graceDays!: number;          // días de gracia antes de mora
  @Field(() => Int, { defaultValue: 0 }) installmentRounding!: number; // redondear cuota al múltiplo (0 = sin)
  @Field(() => Float, { nullable: true }) minLoanAmount?: number;
  @Field(() => Float, { nullable: true }) maxLoanAmount?: number;
  @Field(() => Int, { defaultValue: 2 }) moraRunHour!: number;         // hora del job de mora (0-23)
  @Field(() => Int, { defaultValue: 7 }) reminderRunHour!: number;     // hora de recordatorios (0-23)
  @Field({ defaultValue: false }) requireBaseOnCashOpen!: boolean;
  // Permisos de cobradores
  @Field({ defaultValue: true }) collectorCanCreateLoan!: boolean;
  @Field({ defaultValue: false }) collectorCanEditInstallment!: boolean;
  @Field({ defaultValue: false }) collectorCanDiscount!: boolean;
  @Field({ defaultValue: false }) collectorCanWaiveLateFee!: boolean;
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

@ObjectType('OrgRole')
export class OrgRoleModel {
  @Field(() => ID) id!: string;
  @Field() key!: string;
  @Field() name!: string;
  @Field(() => [String]) permissions!: string[];
  @Field() isSystem!: boolean;
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
