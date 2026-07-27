import { HttpStatus } from '@nestjs/common'
import { DomainException } from '../../../common/exceptions/domain.exception'

/** Removing this admin role would leave the academy with zero admins. */
export class LastAdminException extends DomainException {
  constructor() {
    super(
      'LAST_ADMIN',
      'At least one admin must remain.',
      HttpStatus.CONFLICT,
    )
  }
}

/** An admin may not strip their own admin role (self-lockout). */
export class CannotStripOwnAdminException extends DomainException {
  constructor() {
    super(
      'CANNOT_STRIP_OWN_ADMIN',
      'You cannot remove your own admin role.',
      HttpStatus.FORBIDDEN,
    )
  }
}
