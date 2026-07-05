import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { ProductModel } from './products.models';
import { CreateProductInput } from './products.inputs';
import { CurrentUser, Roles, RequirePermissions } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => ProductModel)
export class ProductsResolver {
  constructor(private readonly products: ProductsService) {}

  @Query(() => [ProductModel], { name: 'creditProducts' })
  list(@CurrentUser() user: AuthContext): Promise<ProductModel[]> {
    return this.products.list(user.tenantId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @RequirePermissions('manage_routes')
  @Mutation(() => ProductModel)
  createCreditProduct(
    @CurrentUser() user: AuthContext,
    @Args('input') input: CreateProductInput,
  ): Promise<ProductModel> {
    return this.products.create(user.tenantId, input);
  }
}
