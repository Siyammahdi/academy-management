import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../modules/mail/mail.service';
import { QUEUE_NAMES, type EmailDispatchJobData } from './queues';

// NTF-03/04 — email delivery is queued; failures stay on the job and never
// propagate back to the HTTP request that enqueued them.
@Processor(QUEUE_NAMES.emailDispatch)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  // @Inject(MailService) keeps the class as a runtime value under tsx/esbuild
  // (constructor param types alone can be erased → UndefinedDependencyException).
  constructor(
    @Inject(MailService) private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<EmailDispatchJobData>): Promise<void> {
    const to = job.data?.message?.to ?? '(missing to)';
    const provider = this.mailService.providerName;
    this.logger.log(
      `email-dispatch job ${job.id} start provider=${provider} to=${to}`,
    );

    try {
      if (!job.data?.message?.to || !job.data.message.subject) {
        throw new Error(
          `Invalid email-dispatch payload for job ${job.id}: missing message.to/subject`,
        );
      }

      await this.mailService.deliver(job.data.message);
      this.logger.log(
        `email-dispatch job ${job.id} delivered provider=${provider} to=${to}`,
      );
    } catch (error) {
      this.logger.error(
        `email-dispatch job ${job.id} FAILED provider=${provider} to=${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      // Re-throw so BullMQ marks the job failed and can retry.
      throw error;
    }
  }
}
