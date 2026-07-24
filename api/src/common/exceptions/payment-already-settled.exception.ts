import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// PAY-08 guard — doc 08 §5's own worked example, reproduced exactly.
export class PaymentAlreadySettledException extends DomainException {
  constructor() {
    super(
      'PAYMENT_ALREADY_SETTLED',
      'This payment has already been settled.',
      HttpStatus.CONFLICT,
    );
  }
}
