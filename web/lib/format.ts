// doc 09 §6 — money and dates in the interface. Display only: these
// functions format already-computed values; they never do arithmetic.
// Money math happens server-side (Decimal), never in the client.

const CURRENCY_SYMBOL = '৳';
const HAIR_SPACE = ' '; // doc 09 §6 — "currency symbol precedes, with a hair space"

/**
 * Formats a money amount for display: always two decimals, ৳ prefix
 * (e.g. "৳ 500.00", never "৳ 500"). Accepts the decimal string the API
 * sends (doc 06/07: money is serialized as a string, never a JSON number)
 * or a plain number for literal/test values.
 */
export function formatMoney(amount: string | number): string {
  const value = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(value)) {
    throw new Error(`formatMoney: invalid amount "${String(amount)}"`);
  }
  return `${CURRENCY_SYMBOL}${HAIR_SPACE}${value.toFixed(2)}`;
}

export type DateFormatVariant = 'short' | 'month';

/**
 * Formats a date for display, always in Asia/Dhaka (doc 09 §6 — never a
 * raw UTC timestamp). Two variants:
 *   - 'short' (default): "5 Mar 2026" — due dates, timestamps
 *   - 'month': "March 2026" — billing period months
 */
export function formatDate(
  date: string | Date,
  variant: DateFormatVariant = 'short',
): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    throw new Error(`formatDate: invalid date "${String(date)}"`);
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: variant === 'short' ? 'numeric' : undefined,
    month: variant === 'short' ? 'short' : 'long',
    year: 'numeric',
  });

  return formatter.format(value);
}
