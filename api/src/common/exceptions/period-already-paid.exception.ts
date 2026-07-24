import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// Guards a redundant payment attempt on a period that's already settled.
export class PeriodAlreadyPaidException extends DomainException {
  constructor() {
    super(
      'PERIOD_ALREADY_PAID',
      'This period is already paid.',
      HttpStatus.CONFLICT,
    );
  }
}
