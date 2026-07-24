import { IsDecimal, IsNotEmpty, IsString } from 'class-validator';
import { IsPositiveDecimalString } from '../../../common/validators/is-positive-decimal-string.validator';

// RFD-03 — may be partial. RFD-05 — reason required.
export class RefundDto {
  @IsDecimal({ decimal_digits: '0,2' })
  @IsPositiveDecimalString()
  amount: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
