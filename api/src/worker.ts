import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './jobs/worker.module';

// doc 07 §5 — a second bootstrap, no HTTP listener, sharing the same
// modules and Prisma client as main.ts. Runs the job processors
// (penalty-sweep, billing-generation, gateway-expiry); main.ts only
// enqueues/schedules via JobsModule, it never consumes.
async function bootstrap() {
  const logger = new Logger('Worker');
  await NestFactory.createApplicationContext(WorkerModule);
  logger.log(
    'Worker started — processing penalty-sweep, billing-generation, gateway-expiry.',
  );
}
void bootstrap();
