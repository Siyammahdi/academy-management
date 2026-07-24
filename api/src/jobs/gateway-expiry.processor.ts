import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentsService } from '../modules/payments/payments.service';
import { QUEUE_NAMES } from './queues';

// PAY-05 — every 15 minutes (scheduled by JobsSchedulerService), plus the
// admin manual-trigger endpoint. The actual cleanup logic
// (PaymentsService.expireStalePendingGatewayPayments) is independently
// unit- and e2e-tested; this processor is just the queue binding.
@Processor(QUEUE_NAMES.gatewayExpiry)
export class GatewayExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(GatewayExpiryProcessor.name);

  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  async process(job: Job): Promise<number> {
    this.logger.log(`gateway-expiry job ${job.id} received`);
    const expiredCount =
      await this.paymentsService.expireStalePendingGatewayPayments();
    this.logger.log(`gateway-expiry: expired ${expiredCount} payment(s)`);
    return expiredCount;
  }
}
