import type { Response } from 'express'
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common'

import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { ReportingService } from './reporting.service'

@Controller()
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Roles('manager', 'admin')
  @UseGuards(RolesGuard)
  @Get('reports/revenue')
  revenue(
    @CurrentUser() user: AuthUser,
    @Query()
    query: { from?: string; to?: string; batchId?: string },
  ) {
    return this.reporting.revenue(user, query)
  }

  @Roles('manager', 'admin')
  @UseGuards(RolesGuard)
  @Get('reports/outstanding')
  outstanding(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      from?: string
      to?: string
      batchId?: string
      page?: string
      limit?: string
    },
  ) {
    return this.reporting.outstanding(user, query)
  }

  @Roles('manager', 'admin')
  @UseGuards(RolesGuard)
  @Get('reports/enrollments')
  enrollments(
    @CurrentUser() user: AuthUser,
    @Query() query: { batchId?: string },
  ) {
    return this.reporting.enrollments(user, query)
  }

  @Roles('manager', 'admin')
  @UseGuards(RolesGuard)
  @Get('reports/ledger')
  ledger(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      from?: string
      to?: string
      batchId?: string
      page?: string
      limit?: string
    },
  ) {
    return this.reporting.ledger(user, query)
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get('reports/export')
  async exportLedgerCsv(
    @CurrentUser() user: AuthUser,
    @Query() query: { from?: string; to?: string; batchId?: string },
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.reporting.exportLedgerCsv(user, query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ledger_${Date.now()}.csv"`,
    )
    res.send(csv)
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get('audit-logs')
  auditLogs(
    @CurrentUser() user: AuthUser,
    @Query()
    query: {
      actorUserId?: string
      action?: string
      targetType?: string
      targetId?: string
      page?: string
      limit?: string
    },
  ) {
    return this.reporting.auditLogs(user, query)
  }
}

