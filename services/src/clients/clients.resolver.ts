import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { ClientModel, ClientGuarantorModel } from './clients.models';
import {
  CreateClientInput, UpdateClientInput, CreateGuarantorInput, UpdateGuarantorInput,
} from './clients.inputs';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => ClientModel)
export class ClientsResolver {
  constructor(private readonly clients: ClientsService) {}

  @Query(() => [ClientModel], { name: 'clients' })
  list(@CurrentUser() user: AuthContext): Promise<ClientModel[]> {
    return this.clients.list(user.tenantId);
  }

  @Query(() => ClientModel, { name: 'client' })
  findOne(
    @CurrentUser() user: AuthContext,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ClientModel> {
    return this.clients.findOne(user.tenantId, id);
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

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => ClientGuarantorModel)
  addGuarantor(
    @CurrentUser() user: AuthContext,
    @Args('input') input: CreateGuarantorInput,
  ): Promise<ClientGuarantorModel> {
    return this.clients.addGuarantor(user.tenantId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLECTOR)
  @Mutation(() => ClientGuarantorModel)
  updateGuarantor(
    @CurrentUser() user: AuthContext,
    @Args('input') input: UpdateGuarantorInput,
  ): Promise<ClientGuarantorModel> {
    return this.clients.updateGuarantor(user.tenantId, input);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Mutation(() => ID)
  deleteGuarantor(
    @CurrentUser() user: AuthContext,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<string> {
    return this.clients.removeGuarantor(user.tenantId, id);
  }
}
