import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { ClientModel } from './clients.models';
import { CreateClientInput, UpdateClientInput } from './clients.inputs';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => ClientModel)
export class ClientsResolver {
  constructor(private readonly clients: ClientsService) {}

  @Query(() => [ClientModel], { name: 'clients' })
  list(@CurrentUser() user: AuthContext): Promise<ClientModel[]> {
    return this.clients.list(user.tenantId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => ClientModel)
  createClient(
    @CurrentUser() user: AuthContext,
    @Args('input') input: CreateClientInput,
  ): Promise<ClientModel> {
    return this.clients.create(user.tenantId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => ClientModel)
  updateClient(
    @CurrentUser() user: AuthContext,
    @Args('input') input: UpdateClientInput,
  ): Promise<ClientModel> {
    return this.clients.update(user.tenantId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Mutation(() => ClientModel)
  deleteClient(
    @CurrentUser() user: AuthContext,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ClientModel> {
    return this.clients.remove(user.tenantId, id);
  }
}
