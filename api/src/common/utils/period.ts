import { Prisma, PeriodStatus } from '@prisma/client';
import { toDhakaDateParts, endOfDhakaDay } from './dhaka-time';

/**
 * The first day of the month containing `instant`, evaluated in Asia/Dhaka
 * (TIME-02), as a pure calendar date — UTC midnight on that Y-M-01
 * (TIME-04). For `@db.Date` columns (e.g. BillingPeriod.periodMonth), which
 * carry no time-of-day or timezone meaning once stored — do not further
 * shift this by the Dhaka offset.
 */
export function firstDayOfDhakaMonth(instant: Date): Date {
  const { year, month } = toDhakaDateParts(instant);
  return new Date(Date.UTC(year, month, 1));
}

/**
 * BIL-05 — a period's dueDate is derived from the batch's dueDayEnd within
 * that period's month (TIME-03's penalty-cutoff wording — "end of the
 * 5th" for a default batch — confirms dueDayEnd is the enforced deadline;
 * dueDayStart is informational only). `periodMonth` must already be a
 * first-of-month value from firstDayOfDhakaMonth.
 */
export function derivePeriodDueDate(
  periodMonth: Date,
  dueDayEnd: number,
): Date {
  const { year, month } = toDhakaDateParts(periodMonth);
  return endOfDhakaDay(year, month, dueDayEnd);
}

/**
 * BIL-09 — period status derives from amounts, never assigned manually.
 * `hasPendingPayment` must reflect payments excluding whichever one is
 * currently being settled/rejected in the same transaction.
 *
 * Precedence: `paid` is an absolute terminal state, checked first
 * regardless of any pending payment. Below that, a pending payment (which
 * could resolve the balance once decided) takes priority over reporting
 * the interim `partially_paid` amount — doc 02 BIL-09's table lists
 * "a pending payment exists → pending" unconditioned on amountPaid.
 */
export function derivePeriodStatus(
  amountOwed: Prisma.Decimal,
  amountPaid: Prisma.Decimal,
  hasPendingPayment: boolean,
): PeriodStatus {
  if (amountPaid.greaterThanOrEqualTo(amountOwed)) {
    return 'paid';
  }
  if (hasPendingPayment) {
    return 'pending';
  }
  if (amountPaid.greaterThan(0)) {
    return 'partially_paid';
  }
  return 'unpaid';
}
