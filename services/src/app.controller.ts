import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators';

/** Ruta raíz para el health-check del orquestador (Fly/InsForge chequea `/`). */
@Public()
@Controller()
export class AppController {
  @Get()
  root() {
    return { name: 'cobradiario-api', status: 'ok' };
  }
}
