import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateRouteInput {
  @Field()
  @IsString()
  @MaxLength(120)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  zone?: string;
}

@InputType()
export class AssignCollectorInput {
  @Field(() => ID)
  @IsString()
  routeId!: string;

  @Field(() => ID)
  @IsString()
  userId!: string;
}
