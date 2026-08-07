import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class EmailNotVerifiedException extends DomainException {
  constructor() {
    super(
      'EMAIL_NOT_VERIFIED',
      'Verify your email before signing in. Check your inbox for a code, or request a new one.',
      HttpStatus.FORBIDDEN,
    );
  }
}

export class EmailAlreadyVerifiedException extends DomainException {
  constructor() {
    super(
      'EMAIL_ALREADY_VERIFIED',
      'This email is already verified. You can sign in.',
      HttpStatus.BAD_REQUEST,
    );
  }
}
