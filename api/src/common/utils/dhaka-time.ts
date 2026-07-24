// doc 02 TIME-01/TIME-02 — timestamps persist in UTC; business-date
// evaluation (due dates, period months) happens in Asia/Dhaka.
//
// Asia/Dhaka has used a fixed UTC+6 offset year-round since 2009 (no DST),
// so this is safe as simple fixed-offset arithmetic rather than needing a
// full IANA timezone database lookup.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

export interface DhakaDateParts {
  year: number;
  month: number; // 0-indexed, matching Date.UTC's convention
  day: number;
}

/** The calendar date (year/month/day) `instant` falls on, as observed in Asia/Dhaka. */
export function toDhakaDateParts(instant: Date): DhakaDateParts {
  const shifted = new Date(instant.getTime() + DHAKA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/**
 * The UTC instant corresponding to 23:59:59 Asia/Dhaka time on the given
 * Dhaka calendar date. For real point-in-time deadlines (e.g. a due date),
 * never for pure calendar dates (see period.ts for those).
 */
export function endOfDhakaDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 23, 59, 59) - DHAKA_OFFSET_MS);
}
