import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../../jobs/queues';
import type { EmailDispatchJobData } from '../../jobs/queues';
import { MAIL_PROVIDER, type MailMessage, type MailProvider } from './mail.provider';

/**
 * Application-facing mail API. Callers enqueue only — the worker's
 * EmailProcessor performs the actual provider.send (NTF-03). A failed
 * send must never roll back the business action that queued it (NTF-04).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.emailDispatch)
    private readonly emailQueue: Queue<EmailDispatchJobData>,
    // Kept injectable so unit tests can bypass the queue and assert the
    // provider contract directly when needed.
    @Inject(MAIL_PROVIDER) private readonly provider: MailProvider,
  ) {}

  /** Active transport name — for worker/processor logs. */
  get providerName(): MailProvider['providerName'] {
    return this.provider.providerName;
  }

  /** Enqueue a message for asynchronous delivery. Never awaits the send. */
  async enqueue(message: MailMessage): Promise<void> {
    await this.emailQueue.add(JOB_NAMES.emailDispatch, { message });
    this.logger.debug(`enqueued email to=${message.to} subject=${message.subject}`);
  }

  /** Direct send — used only by the email-dispatch worker processor. */
  async deliver(message: MailMessage): Promise<void> {
    await this.provider.send(message);
  }
}
