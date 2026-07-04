import { Query, Resolver } from '@nestjs/graphql';
import { ProductsService } from './products.service';
import { ProductModel } from './products.models';
import { CurrentUser } from '../common/decorators';
import { AuthContext } from '../common/types';

@Resolver(() => ProductModel)
export class ProductsResolver {
  constructor(private readonly products: ProductsService) {}

  @Query(() => [ProductModel], { name: 'creditProducts' })
  list(@CurrentUser() user: AuthContext): Promise<ProductModel[]> {
    return this.products.list(user.tenantId);
  }
}
