import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// Not in doc 06 §1's enumerated error-code list — added because login
/// cannot function without it. Deliberately generic: never reveals whether
/// the email or the password was wrong.
export class InvalidCredentialsException extends DomainException {
  constructor() {
    super(
      'INVALID_CREDENTIALS',
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
