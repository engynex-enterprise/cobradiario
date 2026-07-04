import { Field, GraphQLISODateTime, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NotificationChannel, NotificationType } from '@prisma/client';

registerEnumType(NotificationType, { name: 'NotificationType' });
registerEnumType(NotificationChannel, { name: 'NotificationChannel' });

@ObjectType('Notification')
export class NotificationModel {
  @Field(() => ID) id!: string;
  @Field(() => NotificationType) type!: NotificationType;
  @Field(() => NotificationChannel) channel!: NotificationChannel;
  @Field() title!: string;
  @Field() body!: string;
  /** Payload adicional serializado como JSON string. */
  @Field(() => String, { nullable: true }) data?: string;
  @Field(() => GraphQLISODateTime, { nullable: true }) readAt?: Date;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}
