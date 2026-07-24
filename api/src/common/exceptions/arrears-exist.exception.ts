import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// BIL-10 — advance payment refused unless every earlier period on that
/// enrollment is paid.
export class ArrearsExistException extends DomainException {
  constructor() {
    super(
      'ARREARS_EXIST',
      'An earlier period on this enrollment is still unpaid.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
