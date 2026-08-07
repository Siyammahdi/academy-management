import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Payment, Refund } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { TargetResource } from '../../common/decorators/target-resource.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BatchScopeGuard } from '../../common/guards/batch-scope.guard';
import { SelfApprovalGuard } from '../../common/guards/self-approval.guard';
import { PaymentsService, PaymentWithBillingPeriod } from './payments.service';
import { PayManualDto } from './dto/pay-manual.dto';
import { PayGatewayDto } from './dto/pay-gateway.dto';
import { ConfirmGatewayPaymentDto } from './dto/confirm-gateway-payment.dto';
import { AbandonGatewayPaymentDto } from './dto/abandon-gateway-payment.dto';
import { RefundDto } from './dto/refund.dto';
import type { Paginated, PaginationQuery } from '../../common/utils/pagination';

// No shared prefix — doc 06 §7's routes live under /billing-periods,
// /payments, and /me respectively.
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Public — gateway success redirect confirms via provider status API
   * (not the browser alone). Activates enrollment on success (ENR-06).
   */
  @Public()
  @Post('payments/gateway/confirm')
  confirmGateway(
    @Body() dto: ConfirmGatewayPaymentDto,
  ): Promise<{ status: string; enrollmentActivated: boolean }> {
    return this.paymentsService.confirmGatewayPayment(dto);
  }

  /**
   * Public — payer cancelled or failed at the hosted checkout and returned.
   * Rejects the pending gateway payment so enrollment payment can be retried.
   */
  @Public()
  @Post('payments/gateway/abandon')
  abandonGateway(
    @Body() dto: AbandonGatewayPaymentDto,
  ): Promise<{ status: string }> {
    return this.paymentsService.abandonGatewayPayment(
      dto.transactionReference,
    );
  }

  @Roles('student')
  @UseGuards(RolesGuard)
  @Post('billing-periods/:id/pay/gateway')
  payGateway(
    @Param('id') billingPeriodId: string,
    @Body() dto: PayGatewayDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ redirectUrl: string; provider: string }> {
    return this.paymentsService.payGateway(
      billingPeriodId,
      user,
      dto?.provider,
    );
  }

  @Roles('student')
  @UseGuards(RolesGuard)
  @Post('billing-periods/:id/pay/manual')
  payManual(
    @Param('id') billingPeriodId: string,
    @Body() dto: PayManualDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Payment> {
    return this.paymentsService.payManual(billingPeriodId, dto, user);
  }

  @Roles('teacher', 'admin')
  @UseGuards(RolesGuard)
  @Get('payments/pending')
  listPending(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQuery,
  ): Promise<Paginated<PaymentWithBillingPeriod>> {
    return this.paymentsService.listPending(user, query);
  }

  // RBAC-03 — SelfApprovalGuard blocks even a teacher legitimately
  // assigned to this batch, on their own enrollment.
  @Roles('teacher', 'admin')
  @TargetResource('payment')
  @UseGuards(RolesGuard, BatchScopeGuard, SelfApprovalGuard)
  @Post('payments/:id/verify')
  verify(
    @Param('id') paymentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Payment> {
    return this.paymentsService.verify(paymentId, user);
  }

  @Roles('teacher', 'admin')
  @TargetResource('payment')
  @UseGuards(RolesGuard, BatchScopeGuard, SelfApprovalGuard)
  @Post('payments/:id/reject')
  reject(
    @Param('id') paymentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Payment> {
    return this.paymentsService.reject(paymentId, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('payments/:id/refund')
  refund(
    @Param('id') paymentId: string,
    @Body() dto: RefundDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Refund> {
    return this.paymentsService.refund(paymentId, dto, user);
  }

  @Roles('student')
  @UseGuards(RolesGuard)
  @Get('me/payments')
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQuery,
  ): Promise<Paginated<PaymentWithBillingPeriod>> {
    return this.paymentsService.listMine(user, query);
  }
}
