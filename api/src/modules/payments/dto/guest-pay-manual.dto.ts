import { IsNotEmpty, IsString } from 'class-validator';
import { PayManualDto } from './pay-manual.dto';

// Extends the authenticated DTO rather than repeating amount/
// transactionReference/proofUrl's validation (PAY-06/PAY-10). PAY-11 adds
// guestName/guestPhone; billingPeriodId moves into the body since there is
// no /billing-periods/:id/... URL for the flat /guest/... routes.
export class GuestPayManualDto extends PayManualDto {
  @IsString()
  @IsNotEmpty()
  billingPeriodId: string;

  @IsString()
  @IsNotEmpty()
  guestName: string;

  @IsString()
  @IsNotEmpty()
  guestPhone: string;
}
