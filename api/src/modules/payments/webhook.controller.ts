import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import type { SslcommerzWebhookPayload } from '../gateway/gateway.service';

@Controller()
export class WebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // doc 06 §10 — signature-verified, never token-authed; always 200 for a
  // handled callback so SSLCommerz stops retrying. `payload` is a plain
  // interface, not a class-validator DTO: SSLCommerz's real IPN body has
  // far more fields than we care about, and the global ValidationPipe's
  // forbidNonWhitelisted would otherwise reject it outright.
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('webhooks/sslcommerz')
  handleWebhook(
    @Body() payload: SslcommerzWebhookPayload,
  ): Promise<{ ok: true }> {
    return this.paymentsService.handleWebhook(payload);
  }
}
