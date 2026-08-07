import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ProfileNotFoundException extends DomainException {
  constructor() {
    super('PROFILE_NOT_FOUND', 'Profile not found.', HttpStatus.NOT_FOUND);
  }
}

export class EmailTakenException extends DomainException {
  constructor() {
    super(
      'EMAIL_TAKEN',
      'That email is already in use by another account.',
      HttpStatus.CONFLICT,
    );
  }
}

export class PhoneTakenException extends DomainException {
  constructor() {
    super(
      'PHONE_TAKEN',
      'That phone number is already in use by another account.',
      HttpStatus.CONFLICT,
    );
  }
}

export class AvatarInvalidException extends DomainException {
  constructor(message: string) {
    super('AVATAR_INVALID', message, HttpStatus.BAD_REQUEST);
  }
}

export class CurrentPasswordIncorrectException extends DomainException {
  constructor() {
    super(
      'CURRENT_PASSWORD_INCORRECT',
      'Current password is incorrect.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class PasswordConfirmationMismatchException extends DomainException {
  constructor() {
    super(
      'PASSWORD_CONFIRMATION_MISMATCH',
      'New password and confirmation do not match.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class AccountDeleteConfirmationException extends DomainException {
  constructor() {
    super(
      'ACCOUNT_DELETE_CONFIRMATION_INVALID',
      'Type your account email exactly to confirm deletion.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class LastAdminDeleteException extends DomainException {
  constructor() {
    super(
      'LAST_ADMIN_DELETE_BLOCKED',
      'You are the only active admin. Transfer ownership before deleting this account.',
      HttpStatus.CONFLICT,
    );
  }
}
