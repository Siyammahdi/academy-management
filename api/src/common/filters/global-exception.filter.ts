import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';

interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string;
  details: unknown;
}

const STATUS_ERROR_CODES: Partial<Record<number, string>> = {
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
};

/// doc 07 §8 — the single filter producing the doc 06 §1 error envelope.
/// Never leaks internals: unknown errors are logged server-side with a
/// correlation id and returned to the client as a generic 500.
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const envelope = this.resolve(exception);

    response.status(envelope.statusCode).json({
      statusCode: envelope.statusCode,
      error: envelope.error,
      message: envelope.message,
      details: envelope.details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolve(exception: unknown): ErrorEnvelope {
    if (exception instanceof DomainException) {
      return {
        statusCode: exception.getStatus(),
        error: exception.errorCode,
        message: exception.message,
        details: null,
      };
    }

    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }

    const correlationId = randomUUID();
    this.logger.error(
      `Unhandled exception [${correlationId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: null,
    };
  }

  private resolveHttpException(exception: HttpException): ErrorEnvelope {
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (
      Number(status) === Number(HttpStatus.BAD_REQUEST) &&
      this.isValidationBody(body)
    ) {
      const messages = Array.isArray(body.message)
        ? body.message
        : [body.message];
      return {
        statusCode: status,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: messages,
      };
    }

    return {
      statusCode: status,
      error: STATUS_ERROR_CODES[status] ?? 'ERROR',
      message: typeof body === 'string' ? body : exception.message,
      details: null,
    };
  }

  private isValidationBody(
    body: unknown,
  ): body is { message: string[] | string } {
    if (typeof body !== 'object' || body === null || !('message' in body)) {
      return false;
    }
    return Array.isArray(body.message) || typeof body.message === 'string';
  }
}
