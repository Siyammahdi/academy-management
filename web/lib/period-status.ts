import type { StatusTone } from '@/components/money/status-badge'
import type { PillStatus } from '../components/ui/pill'
import type { PeriodStatus } from './api-client'
import { isPastDue } from './homework-status'

/** @deprecated Prefer PERIOD_STATUS_BADGE — kept for pages not yet migrated. */
export const PERIOD_STATUS_PILL: Record<
  PeriodStatus,
  { status: PillStatus; label: string }
> = {
  unpaid: { status: 'unpaid', label: 'Unpaid' },
  pending: { status: 'pending', label: 'Pending' },
  partially_paid: { status: 'partiallyPaid', label: 'Partially paid' },
  paid: { status: 'paid', label: 'Paid' },
}

export const PERIOD_STATUS_BADGE: Record<
  PeriodStatus,
  { tone: StatusTone; label: string }
> = {
  unpaid: { tone: 'overdue', label: 'Unpaid' },
  pending: { tone: 'pending', label: 'Pending' },
  partially_paid: { tone: 'partial', label: 'Partially paid' },
  paid: { tone: 'paid', label: 'Paid' },
}

/** Unpaid/partial past the due instant → overdue tone for attention UI. */
export function periodAttention(
  status: PeriodStatus,
  dueDate: string,
): { tone: StatusTone; label: string } {
  const base = PERIOD_STATUS_BADGE[status]
  if (
    (status === 'unpaid' || status === 'partially_paid') &&
    isPastDue(dueDate)
  ) {
    return {
      tone: 'overdue',
      label: status === 'unpaid' ? 'Overdue' : 'Partial · overdue',
    }
  }
  if (status === 'unpaid') {
    return { tone: 'pending', label: 'Due' }
  }
  return base
}
