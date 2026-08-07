import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class OtpExpiredException extends DomainException {
  constructor() {
    super(
      'OTP_EXPIRED',
      'This verification code has expired. Request a new one.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OtpInvalidException extends DomainException {
  constructor() {
    super(
      'OTP_INVALID',
      'That verification code is incorrect.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OtpTooManyAttemptsException extends DomainException {
  constructor() {
    super(
      'OTP_TOO_MANY_ATTEMPTS',
      'Too many incorrect attempts. Request a new verification code.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OtpNotFoundException extends DomainException {
  constructor() {
    super(
      'OTP_NOT_FOUND',
      'No active verification code. Request a new one.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OtpResendCooldownException extends DomainException {
  constructor(retryAfterSeconds: number) {
    super(
      'OTP_RESEND_COOLDOWN',
      `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
