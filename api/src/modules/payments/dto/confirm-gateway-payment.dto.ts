import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Called from the SSLCommerz success redirect after Order Validation. */
export class ConfirmGatewayPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  transactionReference: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  valId: string;
}
