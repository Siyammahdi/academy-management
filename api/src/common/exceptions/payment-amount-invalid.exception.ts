import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/** Manual payment amount must match the period's outstanding balance. */
export class PaymentAmountInvalidException extends DomainException {
  constructor(message?: string) {
    super(
      'PAYMENT_AMOUNT_INVALID',
      message ??
        'Pay the full outstanding amount for this period. Partial payments need admissions approval.',
      HttpStatus.BAD_REQUEST,
    );
  }
}
