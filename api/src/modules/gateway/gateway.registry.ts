import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_GATEWAY_PROVIDER,
  isGatewayProvider,
  type GatewayProviderId,
  type PaymentGateway,
} from './payment-gateway';
import { PaystationGatewayService } from './paystation.gateway';
import { SslcommerzGatewayService } from './sslcommerz.gateway';

/**
 * Resolves the concrete PaymentGateway for a provider id.
 * Default online provider is PayStation.
 */
@Injectable()
export class GatewayRegistry {
  constructor(
    private readonly paystation: PaystationGatewayService,
    private readonly sslcommerz: SslcommerzGatewayService,
  ) {}

  get(provider?: string | null): PaymentGateway {
    const id = this.resolveId(provider);
    if (id === 'paystation') return this.paystation;
    return this.sslcommerz;
  }

  resolveId(provider?: string | null): GatewayProviderId {
    if (isGatewayProvider(provider)) return provider;
    return DEFAULT_GATEWAY_PROVIDER;
  }

  requireConfigured(provider?: string | null): PaymentGateway {
    const gateway = this.get(provider);
    // Touch credentials via a no-op path: initiate/checkStatus throw
    // GatewayNotConfiguredException when env is missing. Callers catch that.
    if (!gateway) {
      throw new NotFoundException('Payment gateway not found');
    }
    return gateway;
  }
}
