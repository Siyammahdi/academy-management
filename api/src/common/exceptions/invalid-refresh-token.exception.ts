import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// Not in doc 06 §1's enumerated error-code list — added because refresh
/// cannot function without it.
export class InvalidRefreshTokenException extends DomainException {
  constructor() {
    super(
      'INVALID_REFRESH_TOKEN',
      'Invalid or expired refresh token',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
