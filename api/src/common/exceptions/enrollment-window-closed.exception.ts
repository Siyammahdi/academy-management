import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// ENR-02 — self-enrollment is only allowed inside the batch's window.
export class EnrollmentWindowClosedException extends DomainException {
  constructor() {
    super(
      'ENROLLMENT_WINDOW_CLOSED',
      'The enrollment window for this batch is closed.',
      HttpStatus.FORBIDDEN,
    );
  }
}
