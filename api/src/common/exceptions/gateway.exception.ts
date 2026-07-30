import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/// Session init failed (bad credentials, URL not allowed, network, etc.).
export class GatewaySessionFailedException extends DomainException {
  constructor(reason?: string) {
    super(
      'GATEWAY_SESSION_FAILED',
      reason && reason.trim().length > 0
        ? reason.trim()
        : 'Online payment could not be started. Try again or pay manually.',
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class GatewayNotConfiguredException extends DomainException {
  constructor() {
    super(
      'GATEWAY_NOT_CONFIGURED',
      'Online payment is not configured. Contact an admin.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
