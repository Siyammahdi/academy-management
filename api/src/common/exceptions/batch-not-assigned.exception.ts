import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// RBAC-02 / doc 04 §4.3 — manager, unassigned batch
export class BatchNotAssignedException extends DomainException {
  constructor() {
    super(
      'BATCH_NOT_ASSIGNED',
      'You are not assigned to this batch',
      HttpStatus.FORBIDDEN,
    );
  }
}
