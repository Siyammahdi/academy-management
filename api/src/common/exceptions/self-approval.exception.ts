import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// RBAC-03 / doc 04 §4.3 — manager, own enrollment. Applies even when the
/// manager legitimately manages the batch (doc 04 §3.2).
export class SelfApprovalException extends DomainException {
  constructor() {
    super(
      'SELF_APPROVAL_FORBIDDEN',
      'You cannot approve actions on your own enrollment',
      HttpStatus.FORBIDDEN,
    );
  }
}
