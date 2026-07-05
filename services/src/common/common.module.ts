import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

/** Servicios transversales disponibles en toda la app (permisos, etc.). */
@Global()
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class CommonModule {}
