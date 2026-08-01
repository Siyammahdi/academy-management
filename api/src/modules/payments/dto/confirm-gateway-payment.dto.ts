import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { GATEWAY_PROVIDERS } from '../../gateway/payment-gateway';

/**
 * Public confirm after gateway return.
 * - SSLCommerz: requires valId (Order Validation API).
 * - PayStation: confirms via transaction-status using transactionReference (invoice);
 *   trxId is an optional hint for the v2 lookup.
 */
export class ConfirmGatewayPaymentDto {
  @IsOptional()
  @IsIn([...GATEWAY_PROVIDERS])
  provider?: 'paystation' | 'sslcommerz';

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  transactionReference: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  valId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trxId?: string;
}
