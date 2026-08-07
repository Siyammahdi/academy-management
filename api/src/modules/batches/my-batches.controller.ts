import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BatchesService } from './batches.service';
import type { BatchWithSeats } from './batches.service';

// Separate controller (no 'batches' prefix) so these land under /me/... per
// doc 06 §1's own convention for self-scoped reads, alongside
// BatchesController in the same module — same pattern PaymentsModule uses
// for its WebhookController.
@Controller()
export class MyBatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Roles('teacher', 'admin')
  @UseGuards(RolesGuard)
  @Get('me/taught-batches')
  listMine(@CurrentUser() user: AuthUser): Promise<BatchWithSeats[]> {
    return this.batchesService.listMine(user.id);
  }

  @Roles('teacher', 'admin')
  @UseGuards(RolesGuard)
  @Get('me/taught-batches/at-risk-count')
  atRiskCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    return this.batchesService.countAtRisk(user.id);
  }
}
