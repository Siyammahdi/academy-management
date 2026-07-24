import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class StudentNotFoundException extends DomainException {
  constructor() {
    super('STUDENT_NOT_FOUND', 'Student not found.', HttpStatus.NOT_FOUND);
  }
}
