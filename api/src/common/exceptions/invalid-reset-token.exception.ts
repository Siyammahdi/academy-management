import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// Token missing, already used, or otherwise not usable.
export class InvalidResetTokenException extends DomainException {
  constructor() {
    super(
      'INVALID_RESET_TOKEN',
      'This password reset link is invalid or has already been used.',
      HttpStatus.BAD_REQUEST,
    );
  }
}
