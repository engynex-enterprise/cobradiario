import { Module } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { RoutesResolver } from './routes.resolver';

@Module({
  providers: [RoutesService, RoutesResolver],
  exports: [RoutesService],
})
export class RoutesModule {}
