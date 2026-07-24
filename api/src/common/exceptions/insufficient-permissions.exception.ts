import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// doc 04 §4.3 — missing role
export class InsufficientPermissionsException extends DomainException {
  constructor() {
    super(
      'INSUFFICIENT_PERMISSIONS',
      'Insufficient permissions',
      HttpStatus.FORBIDDEN,
    );
  }
}
