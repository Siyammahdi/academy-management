import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// doc 04 §4.3 — no/invalid token
export class UnauthenticatedException extends DomainException {
  constructor() {
    super(
      'UNAUTHENTICATED',
      'Authentication required',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
