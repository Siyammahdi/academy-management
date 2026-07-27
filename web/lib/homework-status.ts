import { dhakaDayKey } from '@/lib/student-dashboard'

// The API resolves dueDate to the exact UTC instant of "end of that Dhaka
// calendar day" (see api's dhaka-time.ts) — so a plain instant comparison
// here is already a Dhaka-time comparison, not a raw-UTC one.
export function isPastDue(dueDate: string): boolean {
  return Date.now() > new Date(dueDate).getTime();
}

/** True when the homework's Dhaka calendar due day is today. */
export function isDueToday(dueDate: string): boolean {
  return dhakaDayKey(dueDate) === dhakaDayKey(new Date().toISOString());
}
