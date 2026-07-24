import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  PaymentsService,
  PenaltySweepResult,
} from '../modules/payments/payments.service';
import { QUEUE_NAMES } from './queues';

// PEN-01 — 00:00 Asia/Dhaka on the 6th (scheduled by JobsSchedulerService),
// plus the admin manual-trigger endpoint. The actual sweep logic
// (PaymentsService.runPenaltySweep) is independently unit- and
// e2e-tested; this processor is just the queue binding.
@Processor(QUEUE_NAMES.penaltySweep)
export class PenaltyProcessor extends WorkerHost {
  private readonly logger = new Logger(PenaltyProcessor.name);

  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  async process(job: Job): Promise<PenaltySweepResult> {
    this.logger.log(`penalty-sweep job ${job.id} received`);
    return this.paymentsService.runPenaltySweep();
  }
}
