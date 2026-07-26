import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queues';
import { JobsSchedulerService } from './jobs-scheduler.service';
import { JobsController } from './jobs.controller';

function parseRedisConnection(url: string): {
  host: string;
  port: number;
  password?: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    password: parsed.password || undefined,
  };
}

// Queue registration + repeatable-job scheduling only — no @Processor
// providers here. Those live in worker.module.ts, wired only into the
// worker bootstrap, so the HTTP process can enqueue jobs (the
// manual-trigger endpoint) and schedule them without also consuming them.
//
// Connection is passed as plain options, not a pre-built ioredis instance
// — BullMQ then creates and owns one ioredis client per queue and closes
// it on module destroy. A shared, externally-created instance would not be
// closed automatically, leaking a connection on every app.close() (this
// showed up as e2e test workers failing to exit cleanly).
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          ...parseRedisConnection(
            process.env.REDIS_URL ?? 'redis://localhost:6379',
          ),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.penaltySweep },
      { name: QUEUE_NAMES.billingGeneration },
      { name: QUEUE_NAMES.gatewayExpiry },
      { name: QUEUE_NAMES.emailDispatch },
    ),
  ],
  controllers: [JobsController],
  providers: [JobsSchedulerService],
  exports: [BullModule],
})
export class JobsModule {}
