import { isPastDue } from '@/lib/homework-status'
import type {
  BillingPeriodWithContext,
  EnrollmentWithBatch,
  HomeworkWithContext,
  RecordingWithContext,
} from '@/lib/api-client'

export function openDuePeriods(periods: BillingPeriodWithContext[]) {
  return periods.filter(
    (p) =>
      p.status === 'unpaid' ||
      p.status === 'partially_paid' ||
      p.status === 'pending',
  )
}

export function activeClassrooms(enrollments: EnrollmentWithBatch[]) {
  return enrollments.filter(
    (e) => e.status === 'active' && Boolean(e.batch.classLink),
  )
}

export function greetingForDhaka(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hour: 'numeric',
      hour12: false,
    }).format(now),
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatDhakaToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now)
}

export function formatDhakaClock(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now)
}

/** Calendar day key in Asia/Dhaka — `YYYY-MM-DD`. */
export function dhakaDayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

export interface RecordingDayGroup {
  key: string
  label: string
  weekday: string
  items: RecordingWithContext[]
}

export function groupRecordingsByDhakaDay(
  items: RecordingWithContext[],
): RecordingDayGroup[] {
  const map = new Map<string, RecordingWithContext[]>()
  for (const item of items) {
    const key = dhakaDayKey(item.recordedFor)
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupItems]) => {
      const sample = groupItems[0]!.recordedFor
      return {
        key,
        label: new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Dhaka',
          day: 'numeric',
          month: 'short',
        }).format(new Date(sample)),
        weekday: new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Dhaka',
          weekday: 'short',
        }).format(new Date(sample)),
        items: [...groupItems].sort((a, b) =>
          b.recordedFor.localeCompare(a.recordedFor),
        ),
      }
    })
}

/** @deprecated kept for any leftover callers */
export function resolveDashboardFocus(
  periods: BillingPeriodWithContext[],
  homework: HomeworkWithContext[],
) {
  const payable = periods
    .filter((p) => p.status === 'unpaid' || p.status === 'partially_paid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const overdue = payable.find((p) => isPastDue(p.dueDate))
  if (overdue) return { kind: 'due' as const, period: overdue, overdue: true }
  if (payable[0]) {
    return { kind: 'due' as const, period: payable[0], overdue: false }
  }
  const pending = periods
    .filter((p) => p.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  if (pending) return { kind: 'pending' as const, period: pending }
  const hwSorted = [...homework].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )
  const pastHw = hwSorted.find((h) => isPastDue(h.dueDate))
  if (pastHw) {
    return { kind: 'homework' as const, homework: pastHw, pastDue: true }
  }
  if (hwSorted[0]) {
    return { kind: 'homework' as const, homework: hwSorted[0], pastDue: false }
  }
  return { kind: 'clear' as const }
}
