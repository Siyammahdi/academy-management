import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOB_NAMES, JOB_SCHEDULES, QUEUE_NAMES } from './queues';

// doc 07 §5 — registers the three repeatable jobs on startup. BullMQ
// dedupes repeatable schedules by their (name, pattern, tz, …) key, so
// calling this on every boot (including a second process, e.g. the HTTP
// app and the worker both importing JobsModule) is idempotent — it upserts
// the same schedule rather than creating duplicates.
@Injectable()
export class JobsSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.penaltySweep) private readonly penaltyQueue: Queue,
    @InjectQueue(QUEUE_NAMES.billingGeneration)
    private readonly billingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.gatewayExpiry)
    private readonly expiryQueue: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const jobOptions = { removeOnComplete: 100, removeOnFail: 500 };

    await this.penaltyQueue.add(
      JOB_NAMES.penaltySweep,
      {},
      { repeat: JOB_SCHEDULES[QUEUE_NAMES.penaltySweep], ...jobOptions },
    );
    await this.billingQueue.add(
      JOB_NAMES.billingGeneration,
      {},
      { repeat: JOB_SCHEDULES[QUEUE_NAMES.billingGeneration], ...jobOptions },
    );
    await this.expiryQueue.add(
      JOB_NAMES.gatewayExpiry,
      {},
      { repeat: JOB_SCHEDULES[QUEUE_NAMES.gatewayExpiry], ...jobOptions },
    );

    this.logger.log(
      'Repeatable jobs registered: penalty-sweep (0 0 6 * * Asia/Dhaka), ' +
        'billing-generation (0 1 1 * * Asia/Dhaka), gateway-expiry (every 15 min).',
    );
  }
}
