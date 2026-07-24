import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class DomainException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus,
  ) {
    super(message, status);
  }
}
