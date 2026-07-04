import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { TenantType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

registerEnumType(TenantType, { name: 'TenantType' });

@InputType()
export class RegisterInput {
  @Field()
  @IsString()
  @MaxLength(120)
  tenantName!: string;

  @Field(() => TenantType, { defaultValue: TenantType.INDIVIDUAL })
  @IsEnum(TenantType)
  tenantType!: TenantType;

  @Field()
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // límite de bcrypt
  password!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  password!: string;
}

@InputType()
export class RefreshInput {
  @Field()
  @IsString()
  refreshToken!: string;
}
