import { Controller, Post, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JOB_NAMES, QUEUE_NAMES } from './queues';

// Admin-only manual triggers so the scheduled jobs can be demonstrated
// without waiting for their real cron time. Each route enqueues the same
// one-off job the repeatable schedule would, through the same queue the
// worker consumes — not a direct service call — so this exercises the
// real path, not a shortcut around it.
@Controller('jobs')
export class JobsController {
  constructor(
    @InjectQueue(QUEUE_NAMES.penaltySweep) private readonly penaltyQueue: Queue,
    @InjectQueue(QUEUE_NAMES.billingGeneration)
    private readonly billingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.gatewayExpiry)
    private readonly expiryQueue: Queue,
  ) {}

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('penalty-sweep/trigger')
  async triggerPenaltySweep(): Promise<{ jobId: string }> {
    const job = await this.penaltyQueue.add(JOB_NAMES.penaltySweep, {});
    return { jobId: job.id ?? '' };
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('billing-generation/trigger')
  async triggerBillingGeneration(): Promise<{ jobId: string }> {
    const job = await this.billingQueue.add(JOB_NAMES.billingGeneration, {});
    return { jobId: job.id ?? '' };
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('gateway-expiry/trigger')
  async triggerGatewayExpiry(): Promise<{ jobId: string }> {
    const job = await this.expiryQueue.add(JOB_NAMES.gatewayExpiry, {});
    return { jobId: job.id ?? '' };
  }
}
