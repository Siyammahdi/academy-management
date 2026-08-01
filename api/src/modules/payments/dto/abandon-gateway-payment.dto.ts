import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Public — payer cancelled/failed at the gateway and returned to the app. */
export class AbandonGatewayPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  transactionReference: string;
}
