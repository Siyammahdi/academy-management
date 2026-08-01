import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { Payment } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { GuestService } from './guest.service';
import type { GuestLookupResult } from './guest.service';
import { GuestLookupDto } from './dto/guest-lookup.dto';
import { PaymentsService } from '../payments/payments.service';
import { GuestPayGatewayDto } from '../payments/dto/guest-pay-gateway.dto';
import { GuestPayManualDto } from '../payments/dto/guest-pay-manual.dto';

// doc 06 §8 — the only public write surface besides auth. Every route here
// is @Public(): no token, ever (doc 04 §5).
@Controller('guest')
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // A query shaped as a POST (it takes a body), not a resource creation —
  // 200, matching /auth/login's same reasoning.
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('lookup')
  lookup(@Body() dto: GuestLookupDto): Promise<GuestLookupResult> {
    return this.guestService.lookup(dto.identifier);
  }

  @Public()
  @Post('pay/gateway')
  payGateway(
    @Body() dto: GuestPayGatewayDto,
  ): Promise<{ redirectUrl: string; provider: string }> {
    return this.paymentsService.guestPayGateway(dto.billingPeriodId, dto);
  }

  @Public()
  @Post('pay/manual')
  payManual(@Body() dto: GuestPayManualDto): Promise<Payment> {
    return this.paymentsService.guestPayManual(dto.billingPeriodId, dto);
  }
}
