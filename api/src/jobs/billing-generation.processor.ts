import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  BillingGenerationResult,
  BillingService,
} from '../modules/billing/billing.service';
import { QUEUE_NAMES } from './queues';

// BIL-04 — 01:00 Asia/Dhaka on the 1st (scheduled by JobsSchedulerService),
// plus the admin manual-trigger endpoint. The actual generation logic
// (BillingService.generateNextPeriods) is independently unit- and
// e2e-tested; this processor is just the queue binding.
@Processor(QUEUE_NAMES.billingGeneration)
export class BillingGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingGenerationProcessor.name);

  constructor(private readonly billingService: BillingService) {
    super();
  }

  async process(job: Job): Promise<BillingGenerationResult> {
    this.logger.log(`billing-generation job ${job.id} received`);
    return this.billingService.generateNextPeriods();
  }
}
