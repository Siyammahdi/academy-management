import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// Not in doc 06 §1's enumerated error-code list (that list omits auth
/// failures entirely) — added because registration cannot function without it.
export class EmailAlreadyRegisteredException extends DomainException {
  constructor() {
    super(
      'EMAIL_ALREADY_REGISTERED',
      'Email is already registered',
      HttpStatus.CONFLICT,
    );
  }
}
