import { ApiError } from './api';
import type { ApiErrorBody } from './api';

// doc 06 §1 — switch on the error code, never the message. Validation
// failures are the one shape worth surfacing verbatim (doc details already
// carry per-field, human-actionable text); everything else falls back to a
// caller-supplied, voice-appropriate message (doc 09 §7).
export function apiErrorMessage(body: ApiErrorBody, fallback: string): string {
  if (
    body.error === 'VALIDATION_ERROR' &&
    Array.isArray(body.details) &&
    body.details.length > 0
  ) {
    return body.details.join(' ');
  }
  if (body.error === 'THUMBNAIL_INVALID' && body.message) {
    return body.message;
  }
  if (body.error === 'COURSE_SLUG_TAKEN') {
    return 'That course URL is already in use. Choose a different slug.';
  }
  if (body.error === 'HOMEWORK_PDF_INVALID' && body.message) {
    return body.message;
  }
  if (body.error === 'PAYMENT_AMOUNT_INVALID' && body.message) {
    return body.message;
  }
  if (
    (body.error === 'GATEWAY_SESSION_FAILED' ||
      body.error === 'GATEWAY_NOT_CONFIGURED') &&
    body.message
  ) {
    return body.message;
  }
  return fallback;
}

// Shared by every payment-submission surface — the authenticated
// PaymentModal and the guest pay flow both hit the same BIL-10/
// PERIOD_ALREADY_PAID codes, since they run through the same
// payments.service.ts logic (doc 06 §8: guest payments follow the same
// rules as authenticated ones).
export function payErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.body.error === 'ARREARS_EXIST') {
      return 'Pay your earlier dues first — this period is next in line after that.';
    }
    if (err.body.error === 'PERIOD_ALREADY_PAID') {
      return 'This period is already fully paid.';
    }
    return apiErrorMessage(err.body, fallback);
  }
  return fallback;
}
