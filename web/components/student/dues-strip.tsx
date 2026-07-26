'use client'

import Link from 'next/link'
import { WalletIcon } from 'lucide-react'

import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { isPastDue } from '@/lib/homework-status'
import { periodAttention } from '@/lib/period-status'
import { openDuePeriods } from '@/lib/student-dashboard'
import type { BillingPeriodWithContext } from '@/lib/api-client'

interface DuesStripProps {
  periods: BillingPeriodWithContext[]
  onPay: (period: BillingPeriodWithContext) => void
}

/** Compact vertical panel for the dashboard side column. */
export function DuesStrip({ periods, onPay }: DuesStripProps) {
  const items = openDuePeriods(periods).sort((a, b) => {
    const aOver =
      (a.status === 'unpaid' || a.status === 'partially_paid') &&
      isPastDue(a.dueDate)
    const bOver =
      (b.status === 'unpaid' || b.status === 'partially_paid') &&
      isPastDue(b.dueDate)
    if (aOver !== bOver) return aOver ? -1 : 1
    return a.dueDate.localeCompare(b.dueDate)
  })

  if (items.length === 0) {
    return (
      <section className="flex h-full flex-col overflow-hidden rounded-xl bg-status-paid-bg">
        <div className="flex items-start gap-3 px-5 py-4">
          <span className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-status-paid/15 text-status-paid">
            <WalletIcon className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Dues
            </h2>
            <p className="text-xs text-muted-foreground">Nothing open</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-5 pb-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            You are clear on open dues. Each course still bills on its own —
            never as one combined total.
          </p>
          <Button
            variant="link"
            size="sm"
            className="mt-2 h-auto justify-start px-0 text-primary-strong"
            render={<Link href="/dashboard/dues" />}
          >
            View ledger
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl bg-card">
      <div className="bg-status-overdue-bg px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 items-center justify-center rounded-lg bg-status-overdue/15 text-status-overdue">
              <WalletIcon className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                Open dues
              </h2>
              <p className="text-xs text-muted-foreground">
                {items.length} · listed per enrollment
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            render={<Link href="/dashboard/dues" />}
          >
            All
          </Button>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-1 p-3">
        {items.map((period) => {
          const attention = periodAttention(period.status, period.dueDate)
          const canPay =
            period.status === 'unpaid' || period.status === 'partially_paid'

          return (
            <li
              key={period.id}
              className="rounded-lg bg-muted/60 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-foreground">
                  {period.enrollment.batch.course.title}
                </p>
                <StatusBadge tone={attention.tone} label={attention.label} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {period.enrollment.batch.name} · Due{' '}
                <span className="tabular-nums">
                  {formatDate(period.dueDate)}
                </span>
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                {period.status === 'pending' ? (
                  <AmountCell
                    amount={period.outstanding}
                    className="text-sm font-semibold"
                  />
                ) : (
                  <AmountCell
                    amount={period.outstanding}
                    outstanding
                    labeled
                    className="text-xs font-semibold"
                  />
                )}
                {canPay ? (
                  <Button size="sm" onClick={() => onPay(period)}>
                    Pay
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    render={<Link href="/dashboard/payments" />}
                  >
                    Status
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
