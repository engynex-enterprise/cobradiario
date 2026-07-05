import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('ClientGuarantor')
export class ClientGuarantorModel {
  @Field(() => ID) id!: string;
  @Field() fullName!: string;
  @Field({ nullable: true }) documentId?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) address?: string;
  @Field({ nullable: true }) relationship?: string;
  @Field({ nullable: true }) notes?: string;
}

@ObjectType('ClientReference')
export class ClientReferenceModel {
  @Field() fullName!: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) relationship?: string;
  @Field({ nullable: true }) notes?: string;
}

@ObjectType('Client')
export class ClientModel {
  @Field(() => ID) id!: string;
  @Field() fullName!: string;
  @Field({ nullable: true }) documentId?: string;
  @Field({ nullable: true }) documentType?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) phone2?: string;
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) address?: string;
  @Field({ nullable: true }) neighborhood?: string;
  @Field({ nullable: true }) city?: string;
  @Field({ nullable: true }) occupation?: string;
  @Field({ nullable: true }) birthDate?: Date;
  @Field(() => Float, { nullable: true }) latitude?: number;
  @Field(() => Float, { nullable: true }) longitude?: number;
  @Field({ nullable: true }) notes?: string;
  @Field({ nullable: true }) photoUrl?: string;
  @Field({ nullable: true }) documentFrontUrl?: string;
  @Field({ nullable: true }) documentBackUrl?: string;
  @Field({ nullable: true }) selfieWithDocUrl?: string;
  @Field({ nullable: true }) signatureUrl?: string;
  @Field({ defaultValue: false }) isBlacklisted!: boolean;
  @Field() createdAt!: Date;
  @Field(() => Int, { defaultValue: 0 }) loansCount!: number;
  @Field(() => Int, { defaultValue: 0 }) activeLoans!: number;
  @Field(() => Int, { defaultValue: 0 }) paidLoans!: number;
  @Field(() => Int, { defaultValue: 0 }) defaultedLoans!: number;
  @Field(() => Float, { defaultValue: 0 }) totalBalance!: number;
  // Score crediticio (150–950, estilo DataCrédito). null = sin historial.
  @Field(() => Int, { nullable: true }) creditScore?: number;
  // Nivel de riesgo derivado del score: LOW | MEDIUM | HIGH | NONE.
  @Field({ defaultValue: 'NONE' }) riskLevel!: string;
  @Field(() => [ClientGuarantorModel], { defaultValue: [] }) guarantors!: ClientGuarantorModel[];
  @Field(() => [ClientReferenceModel], { defaultValue: [] }) references!: ClientReferenceModel[];
}
