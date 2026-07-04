import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotificationsService } from './notifications.service';
import { NotificationModel } from './notifications.models';
import { CurrentUser } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => NotificationModel)
export class NotificationsResolver {
  constructor(private readonly notifications: NotificationsService) {}

  @Query(() => [NotificationModel], { name: 'myNotifications' })
  list(@CurrentUser() user: AuthContext): Promise<NotificationModel[]> {
    return this.notifications.listForUser(user.tenantId, user.userId);
  }

  @Mutation(() => Boolean)
  markNotificationRead(
    @CurrentUser() user: AuthContext,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.notifications.markRead(user.tenantId, id);
  }

  @Mutation(() => Boolean)
  registerDeviceToken(
    @CurrentUser() user: AuthContext,
    @Args('token') token: string,
    @Args('platform') platform: string,
  ): Promise<boolean> {
    return this.notifications.registerDeviceToken(user.tenantId, user.userId, token, platform);
  }
}
