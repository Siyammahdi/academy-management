import { IsDecimal, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { IsPositiveDecimalString } from '../../../common/validators/is-positive-decimal-string.validator';

// PAY-06 — a manual payment requires a transactionReference and a proofUrl.
// PAY-10 — amount must be > 0.
// Proof must be an https link (no javascript:/data: URLs).
export class PayManualDto {
  @IsDecimal({ decimal_digits: '0,2' })
  @IsPositiveDecimalString()
  amount: string;

  @IsString()
  @IsNotEmpty()
  transactionReference: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  proofUrl: string;
}
