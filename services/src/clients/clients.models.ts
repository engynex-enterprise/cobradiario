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
  @Field() createdAt!: Date;
  @Field(() => Int, { defaultValue: 0 }) loansCount!: number;
  @Field(() => Int, { defaultValue: 0 }) activeLoans!: number;
  @Field(() => Float, { defaultValue: 0 }) totalBalance!: number;
  @Field(() => [ClientGuarantorModel], { defaultValue: [] }) guarantors!: ClientGuarantorModel[];
}
