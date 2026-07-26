import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class ResetTokenExpiredException extends DomainException {
  constructor() {
    super(
      'RESET_TOKEN_EXPIRED',
      'This password reset link has expired. Request a new one.',
      HttpStatus.BAD_REQUEST,
    );
  }
}
