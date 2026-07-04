import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TeamService } from './team.service';
import { TeamResolver } from './team.resolver';

@Module({
  imports: [ConfigModule],
  providers: [TeamService, TeamResolver],
  exports: [TeamService],
})
export class TeamModule {}
