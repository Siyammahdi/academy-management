import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BillingService } from './billing.service';
import type { BillingPeriodWithContext } from './billing.service';
import type { PaginationQuery, Paginated } from '../../common/utils/pagination';

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Roles('student')
  @UseGuards(RolesGuard)
  @Get('me/billing-periods')
  listMine(
    @Query() query: PaginationQuery & { status?: string },
    @CurrentUser() user: AuthUser,
  ): Promise<Paginated<BillingPeriodWithContext>> {
    return this.billingService.listMine(user, query);
  }
}
