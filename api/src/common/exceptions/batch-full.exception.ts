import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// ENR-03 — doc 07 §8's own worked example, reproduced exactly.
export class BatchFullException extends DomainException {
  constructor() {
    super('BATCH_FULL', 'Full — try next batch.', HttpStatus.CONFLICT);
  }
}
