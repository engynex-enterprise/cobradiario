import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('RouteCollectorInfo')
export class RouteCollectorInfo {
  @Field(() => ID) userId!: string;
  @Field() fullName!: string;
}

@ObjectType('Route')
export class RouteModel {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field({ nullable: true }) code?: string;
  @Field({ nullable: true }) zone?: string;
  @Field() isActive!: boolean;
  @Field(() => [RouteCollectorInfo]) collectors!: RouteCollectorInfo[];
}
