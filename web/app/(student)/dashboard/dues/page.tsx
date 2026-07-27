'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCwIcon } from 'lucide-react'

import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { useCurrentUser } from '@/components/auth/current-user-provider'
import { PaymentModal } from '@/components/payments/payment-modal'
import { Button } from '@/components/ui/button'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listMyBillingPeriods,
  type BillingPeriodWithContext,
  type PeriodStatus,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'
import { PERIOD_STATUS_BADGE, periodAttention } from '@/lib/period-status'
import { displayName } from '@/lib/user-display'

const STATUS_OPTIONS: Array<PeriodStatus | 'all'> = [
  'all',
  'unpaid',
  'pending',
  'partially_paid',
  'paid',
]

/**
 * Student — Payment Status
 * Per-period dues from GET /me/billing-periods. Never sum across enrollments.
 */
export default function StudentDuesPage() {
  const { user } = useCurrentUser()
  const [statusFilter, setStatusFilter] = useState<PeriodStatus | 'all'>('all')
  const [periods, setPeriods] = useState<BillingPeriodWithContext[] | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [payingPeriod, setPayingPeriod] =
    useState<BillingPeriodWithContext | null>(null)

  async function reload(): Promise<void> {
    try {
      const result = await listMyBillingPeriods(
        statusFilter === 'all' ? undefined : statusFilter,
        1,
        100,
      )
      setPeriods(result.data)
      setError(null)
    } catch {
      setError('Your dues could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    listMyBillingPeriods(
      statusFilter === 'all' ? undefined : statusFilter,
      1,
      100,
    )
      .then((result) => {
        if (!cancelled) {
          setPeriods(result.data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your dues could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [statusFilter])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Payments"
        title={
          user
            ? `Payment status for ${displayName(user)}`
            : 'Your payment status'
        }
        description="Every billing period across every enrollment, shown separately — never combined into one total."
        actions={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                void reload()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
            <Button
              variant="secondary"
              className="min-h-11"
              render={<Link href="/dashboard/payments" />}
            >
              Payment history
            </Button>
          </>
        }
      />

      <FilterDropdown
        className="w-full sm:max-w-xs"
        label="Status"
        value={statusFilter}
        onChange={(v) => setStatusFilter(v as PeriodStatus | 'all')}
        options={STATUS_OPTIONS.map((s) =>
          s === 'all'
            ? { value: 'all', label: 'All statuses' }
            : {
                value: s,
                label: PERIOD_STATUS_BADGE[s].label,
              },
        )}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!periods && !error ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {periods && periods.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No billing periods match this filter
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paid periods and open dues appear here once you enroll.
          </p>
        </div>
      ) : null}

      {periods && periods.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {periods.map((period) => {
            const attention = periodAttention(period.status, period.dueDate)
            const canPay =
              period.status === 'unpaid' || period.status === 'partially_paid'
            return (
              <li
                key={period.id}
                className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-base font-semibold text-foreground">
                      {formatDate(period.periodMonth, 'month')}
                    </h2>
                    <StatusBadge
                      tone={attention.tone}
                      label={attention.label}
                    />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {period.enrollment.batch.course.title} ·{' '}
                    {period.enrollment.batch.name}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    Due {formatDate(period.dueDate)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  <AmountCell
                    amount={period.amountOwed}
                    className="text-base font-semibold"
                  />
                  {period.status !== 'paid' ? (
                    <AmountCell
                      amount={period.outstanding}
                      outstanding
                      labeled
                      className="text-xs"
                    />
                  ) : null}
                  {canPay ? (
                    <Button
                      className="min-h-11"
                      onClick={() => setPayingPeriod(period)}
                    >
                      Pay this due
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {payingPeriod ? (
        <PaymentModal
          isOpen
          onClose={() => setPayingPeriod(null)}
          billingPeriodId={payingPeriod.id}
          periodLabel={`${payingPeriod.enrollment.batch.course.title} · ${payingPeriod.enrollment.batch.name} · ${formatDate(payingPeriod.periodMonth, 'month')}`}
          outstanding={payingPeriod.outstanding}
          onSubmitted={() => {
            setPayingPeriod(null)
            void reload()
          }}
        />
      ) : null}
    </div>
  )
}
