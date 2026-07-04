import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { Message, MessagesQueryInput, SendMessageInput } from './chat.models';
import { CurrentUser } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => Message)
export class ChatResolver {
  constructor(private readonly chat: ChatService) {}

  @Query(() => [Message], { name: 'messages' })
  list(
    @CurrentUser() user: AuthContext,
    @Args('query', { nullable: true }) query?: MessagesQueryInput,
  ): Promise<Message[]> {
    return this.chat.list(user.tenantId, query ?? {});
  }

  @Mutation(() => Message, { name: 'sendMessage' })
  send(@CurrentUser() user: AuthContext, @Args('input') input: SendMessageInput): Promise<Message> {
    return this.chat.send(user, input);
  }
}
