// doc 06 §8 — the guest payment surface. Unauthenticated: apiFetch attaches
// a token only if one exists in the browser, and these routes ignore it
// either way (they're @Public() on the API side), so this is safe to call
// from a logged-out visitor exactly as-is.

import { apiFetch } from './api';

export interface GuestOutstandingDue {
  billingPeriodId: string;
  courseTitle: string;
  batchName: string;
  periodMonth: string;
  amountOutstanding: string;
}

export interface GuestLookupResult {
  student: { fullName: string };
  outstandingDues: GuestOutstandingDue[];
}

export function guestLookup(identifier: string): Promise<GuestLookupResult> {
  return apiFetch('/guest/lookup', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
}

export interface GuestPayGatewayInput {
  billingPeriodId: string;
  guestName: string;
  guestPhone: string;
  provider?: 'paystation' | 'sslcommerz';
}

export function guestPayGateway(
  input: GuestPayGatewayInput,
): Promise<{ redirectUrl: string; provider: string }> {
  return apiFetch('/guest/pay/gateway', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      provider: input.provider ?? 'paystation',
    }),
  });
}

export interface GuestPayManualInput {
  billingPeriodId: string;
  amount: string;
  transactionReference: string;
  proofUrl: string;
  guestName: string;
  guestPhone: string;
}

export interface GuestPayment {
  id: string;
  status: string;
}

export function guestPayManual(
  input: GuestPayManualInput,
): Promise<GuestPayment> {
  return apiFetch('/guest/pay/manual', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
