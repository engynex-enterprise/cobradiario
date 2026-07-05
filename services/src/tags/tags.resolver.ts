import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TagsService } from './tags.service';
import { CreateTagInput, Tag, UpdateTagInput } from './tags.models';
import { CurrentUser, Roles, RequirePermissions } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => Tag)
export class TagsResolver {
  constructor(private readonly tags: TagsService) {}

  @Query(() => [Tag], { name: 'tags' })
  list(@CurrentUser() user: AuthContext): Promise<Tag[]> {
    return this.tags.list(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN')
  @RequirePermissions('manage_routes')
  @Mutation(() => Tag, { name: 'createTag' })
  create(@CurrentUser() user: AuthContext, @Args('input') input: CreateTagInput): Promise<Tag> {
    return this.tags.create(user.tenantId, input);
  }

  @Roles('OWNER', 'ADMIN')
  @RequirePermissions('manage_routes')
  @Mutation(() => Tag, { name: 'updateTag', nullable: true })
  update(@CurrentUser() user: AuthContext, @Args('input') input: UpdateTagInput): Promise<Tag | null> {
    return this.tags.update(user.tenantId, input);
  }

  @Roles('OWNER', 'ADMIN')
  @RequirePermissions('manage_routes')
  @Mutation(() => Boolean, { name: 'deleteTag' })
  remove(@CurrentUser() user: AuthContext, @Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.tags.remove(user.tenantId, id);
  }
}
