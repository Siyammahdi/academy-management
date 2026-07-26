import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../modules/mail/mail.service';
import { QUEUE_NAMES, type EmailDispatchJobData } from './queues';

// NTF-03/04 — email delivery is queued; failures stay on the job and never
// propagate back to the HTTP request that enqueued them.
@Processor(QUEUE_NAMES.emailDispatch)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<EmailDispatchJobData>): Promise<void> {
    this.logger.log(
      `email-dispatch job ${job.id} to=${job.data.message.to}`,
    );
    await this.mailService.deliver(job.data.message);
  }
}
