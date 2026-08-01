import { Module } from '@nestjs/common';
import { GatewayRegistry } from './gateway.registry';
import { PaystationGatewayService } from './paystation.gateway';
import { SslcommerzGatewayService } from './sslcommerz.gateway';

@Module({
  providers: [
    SslcommerzGatewayService,
    PaystationGatewayService,
    GatewayRegistry,
  ],
  exports: [
    SslcommerzGatewayService,
    PaystationGatewayService,
    GatewayRegistry,
  ],
})
export class GatewayModule {}
