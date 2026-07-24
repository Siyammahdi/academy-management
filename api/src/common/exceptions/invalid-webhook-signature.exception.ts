import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// PAY-03 / doc 06 §10 step 1 — invalid signature, log, stop.
export class InvalidWebhookSignatureException extends DomainException {
  constructor() {
    super(
      'INVALID_WEBHOOK_SIGNATURE',
      'Invalid webhook signature.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
