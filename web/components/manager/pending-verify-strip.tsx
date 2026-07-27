'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckIcon, ExternalLinkIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'
import { rejectPayment, verifyPayment } from '@/lib/api-client'
import type { PendingPayment } from '@/lib/api-client'

interface PendingVerifyStripProps {
  initial: PendingPayment[]
  total: number
  onChanged: () => void
  /** Full verification queue route — manager or admin. */
  queueHref?: string
}

function actionError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.body.error === 'PAYMENT_ALREADY_SETTLED') {
      return 'This payment has already been settled.'
    }
    if (err.body.error === 'SELF_APPROVAL_FORBIDDEN') {
      return 'You cannot approve actions on your own enrollment.'
    }
    return apiErrorMessage(err.body, fallback)
  }
  return fallback
}

/** Compact verify queue for the manager home — never sums amounts. */
export function PendingVerifyStrip({
  initial,
  total,
  onChanged,
  queueHref = '/manager/payments',
}: PendingVerifyStripProps) {
  const [items, setItems] = useState(initial)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (total === 0) {
    return (
      <section className="rounded-xl bg-muted/50 px-4 py-6 text-center sm:px-5 sm:py-8">
        <p className="font-heading text-base font-semibold text-foreground">
          Verification queue
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          No manual payments waiting in your batches.
        </p>
      </section>
    )
  }

  async function onVerify(payment: PendingPayment): Promise<void> {
    setBusyId(payment.id)
    try {
      await verifyPayment(payment.id)
      setItems((prev) => prev.filter((p) => p.id !== payment.id))
      toast.success('Payment verified')
      onChanged()
    } catch (err) {
      toast.error(actionError(err, 'Payment could not be verified.'))
    } finally {
      setBusyId(null)
    }
  }

  async function onReject(payment: PendingPayment): Promise<void> {
    if (
      !window.confirm(
        'Reject this payment? The student will need to submit again.',
      )
    ) {
      return
    }
    setBusyId(payment.id)
    try {
      await rejectPayment(payment.id)
      setItems((prev) => prev.filter((p) => p.id !== payment.id))
      toast.success('Payment rejected')
      onChanged()
    } catch (err) {
      toast.error(actionError(err, 'Payment could not be rejected.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Needs verification
          </h2>
          <p className="text-sm text-muted-foreground">
            {total} pending · shown per payment, never combined
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          render={<Link href={queueHref} />}
        >
          Full queue
          <ExternalLinkIcon />
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((payment) => {
          const enrollment = payment.billingPeriod.enrollment
          const busy = busyId === payment.id

          return (
            <li
              key={payment.id}
              className="rounded-xl bg-status-pending-bg/50 p-3.5 sm:p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {enrollment.student.fullName}
                    </p>
                    <StatusBadge tone="pending" label="Pending" />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-none sm:truncate">
                    {enrollment.batch.course.title} · {enrollment.batch.name}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatDate(payment.billingPeriod.periodMonth, 'month')} ·{' '}
                    {formatDate(payment.createdAt)}
                  </p>
                  <AmountCell
                    amount={payment.amount}
                    className="text-base font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  <Button
                    size="sm"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => {
                      void onVerify(payment)
                    }}
                  >
                    <CheckIcon />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => {
                      void onReject(payment)
                    }}
                  >
                    <XIcon />
                    Reject
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {total > items.length ? (
        <Button
          variant="secondary"
          className="min-h-11 w-full"
          render={<Link href={queueHref} />}
        >
          View all {total} pending
        </Button>
      ) : null}
    </section>
  )
}
