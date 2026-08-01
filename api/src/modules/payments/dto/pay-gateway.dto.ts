import { IsIn, IsOptional } from 'class-validator';
import { GATEWAY_PROVIDERS } from '../../gateway/payment-gateway';

/** Optional body for POST /billing-periods/:id/pay/gateway */
export class PayGatewayDto {
  @IsOptional()
  @IsIn([...GATEWAY_PROVIDERS])
  provider?: 'paystation' | 'sslcommerz';
}
