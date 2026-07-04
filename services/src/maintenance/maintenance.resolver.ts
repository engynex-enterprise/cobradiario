import { InjectQueue } from '@nestjs/bullmq';
import { Args, Field, Int, Mutation, ObjectType, Resolver } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';
import { Queue } from 'bullmq';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthContext } from '../common/types';
import { QUEUE_MAINTENANCE, type MaintenanceJob } from '../queue/queue.constants';

@ObjectType()
class EnqueuedJob {
  @Field() jobId!: string;
  @Field() queue!: string;
}

/**
 * Disparadores manuales (admin) para los barridos, útiles para operar y para pruebas.
 * La ejecución la realiza el worker de la cola (mismo camino que el cron).
 */
@Resolver()
export class MaintenanceResolver {
  constructor(
    @InjectQueue(QUEUE_MAINTENANCE) private readonly queue: Queue<MaintenanceJob>,
  ) {}

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Mutation(() => EnqueuedJob)
  async runOverdueSweep(@CurrentUser() user: AuthContext): Promise<EnqueuedJob> {
    const job = await this.queue.add('overdue-sweep', { type: 'overdue-sweep', tenantId: user.tenantId });
    return { jobId: String(job.id), queue: QUEUE_MAINTENANCE };
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Mutation(() => EnqueuedJob)
  async runDueReminders(
    @CurrentUser() user: AuthContext,
    @Args('withinDays', { type: () => Int, defaultValue: 1 }) withinDays: number,
  ): Promise<EnqueuedJob> {
    const job = await this.queue.add('due-reminders', {
      type: 'due-reminders',
      tenantId: user.tenantId,
      withinDays,
    });
    return { jobId: String(job.id), queue: QUEUE_MAINTENANCE };
  }
}
