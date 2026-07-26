import { Module } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PenaltyProcessor } from './penalty.processor';
import { BillingGenerationProcessor } from './billing-generation.processor';
import { GatewayExpiryProcessor } from './gateway-expiry.processor';
import { EmailProcessor } from './email.processor';

// worker.ts's root module — imports AppModule wholesale so every business
// module (Prisma, Payments, Billing, …) is the exact same code the HTTP
// process runs, then adds the @Processor providers that actually consume
// jobs. Those are declared only here, not in AppModule itself, so the
// HTTP process can enqueue/schedule jobs (JobsModule) without also
// consuming them — only a process that bootstraps WorkerModule does that.
@Module({
  imports: [AppModule],
  providers: [
    PenaltyProcessor,
    BillingGenerationProcessor,
    GatewayExpiryProcessor,
    EmailProcessor,
  ],
})
export class WorkerModule {}
