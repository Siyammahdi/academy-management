import { IsNotEmpty, IsString } from 'class-validator';

// PAY-11 — a guest payment must record guestName and guestPhone. There is
// no token to derive the billing period's owner from, so the period is
// identified in the body instead of the URL (doc 06 §8's routes are flat
// under /guest/..., unlike the authenticated /billing-periods/:id/... ones).
export class GuestPayGatewayDto {
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
