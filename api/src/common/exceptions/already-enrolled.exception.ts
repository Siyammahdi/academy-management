import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// ENR-10 — unique (studentId, batchId); no double enrollment.
export class AlreadyEnrolledException extends DomainException {
  constructor() {
    super(
      'ALREADY_ENROLLED',
      'This student is already enrolled in this batch.',
      HttpStatus.CONFLICT,
    );
  }
}
