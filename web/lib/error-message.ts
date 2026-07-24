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
  return fallback;
}
