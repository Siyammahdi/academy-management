'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/error-message'
import { formatDate } from '@/lib/format'
import {
  listPendingPayments,
  rejectPayment,
  verifyPayment,
  type PendingPayment,
} from '@/lib/api-client'

const LIMIT = 20

function paymentActionErrorMessage(err: unknown, fallback: string): string {
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

export interface PendingPaymentsQueueProps {
  eyebrow?: string
  description?: string
  hideHeader?: boolean
}

export function PendingPaymentsQueue({
  eyebrow = 'Payments',
  description = 'Manual payment proofs waiting for verification.',
  hideHeader = false,
}: PendingPaymentsQueueProps) {
  const [page, setPage] = useState(1)
  const [payments, setPayments] = useState<PendingPayment[] | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingPayment | null>(null)
  const [query, setQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  async function load(nextPage = page): Promise<void> {
    setLoading(true)
    try {
      const result = await listPendingPayments(nextPage, LIMIT)
      setPayments(result.data)
      setTotal(result.meta.total)
      setTotalPages(Math.max(1, result.meta.totalPages))
      setPage(result.meta.page)
      setError(null)
    } catch {
      setError('The verification queue could not be loaded. Try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    listPendingPayments(page, LIMIT)
      .then((result) => {
        if (cancelled) return
        setPayments(result.data)
        setTotal(result.meta.total)
        setTotalPages(Math.max(1, result.meta.totalPages))
        setError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setError('The verification queue could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [page])

  const batchOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const payment of payments ?? []) {
      const batch = payment.billingPeriod.enrollment.batch
      map.set(batch.id, `${batch.course.title} · ${batch.name}`)
    }
    return [
      { value: 'all', label: 'All batches' },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ]
  }, [payments])

  const filtered = useMemo(() => {
    if (!payments) return []
    const q = query.trim().toLowerCase()
    return payments.filter((payment) => {
      const { enrollment } = payment.billingPeriod
      if (batchFilter !== 'all' && enrollment.batch.id !== batchFilter) {
        return false
      }
      if (!q) return true
      const haystack = [
        enrollment.student.fullName,
        enrollment.student.studentId,
        enrollment.student.phone,
        enrollment.batch.name,
        enrollment.batch.course.title,
        payment.transactionReference ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [payments, query, batchFilter])

  async function handleVerify(payment: PendingPayment): Promise<void> {
    setBusyId(payment.id)
    try {
      await verifyPayment(payment.id)
      setPayments((prev) => prev?.filter((p) => p.id !== payment.id) ?? null)
      setTotal((t) => Math.max(0, t - 1))
      toast.success('Payment verified')
    } catch (err) {
      toast.error(
        paymentActionErrorMessage(
          err,
          'Payment could not be verified. Try again or contact an admin.',
        ),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleConfirmReject(): Promise<void> {
    if (!rejectTarget) return
    setBusyId(rejectTarget.id)
    try {
      await rejectPayment(rejectTarget.id)
      setPayments(
        (prev) => prev?.filter((p) => p.id !== rejectTarget.id) ?? null,
      )
      setTotal((t) => Math.max(0, t - 1))
      setRejectTarget(null)
      toast.success('Payment rejected')
    } catch (err) {
      toast.error(
        paymentActionErrorMessage(
          err,
          'Payment could not be rejected. Try again or contact an admin.',
        ),
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {hideHeader ? null : (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-primary-strong">{eyebrow}</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Verify payments
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <p className="text-xs text-primary-foreground/75">Awaiting verify</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
            {payments ? total : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-status-pending-bg p-4">
          <p className="text-xs text-status-pending">On this page</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-status-pending">
            {payments ? filtered.length : '—'}
          </p>
        </div>
        <div className="col-span-2 rounded-xl bg-muted/60 p-4 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Page</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-foreground">
            {page}
            <span className="text-base font-medium text-muted-foreground">
              {' '}
              / {totalPages}
            </span>
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, batch, or reference"
            className="min-h-11 pl-9"
            aria-label="Search payments"
          />
        </div>
        <FilterDropdown
          label="Batch"
          value={batchFilter}
          onChange={setBatchFilter}
          options={batchOptions}
          className="sm:w-64"
          contentClassName="min-w-72"
        />
        <Button
          variant="outline"
          className="min-h-11"
          disabled={loading}
          onClick={() => {
            void load(page)
          }}
        >
          <RefreshCwIcon />
          Refresh
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!payments && !error ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {payments && filtered.length === 0 ? (
        <div className="rounded-xl bg-primary-wash px-5 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            {payments.length === 0
              ? 'No payments awaiting verification'
              : 'No matches on this page'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {payments.length === 0
              ? 'Manual proofs land here. Gateway settlements never appear in this queue.'
              : 'Try a different search or batch filter, or go to another page.'}
          </p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {filtered.map((payment) => {
            const { enrollment } = payment.billingPeriod
            const isBusy = busyId === payment.id
            return (
              <li
                key={payment.id}
                className="rounded-xl bg-muted/60 px-4 py-4 sm:px-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {enrollment.student.fullName}
                      </p>
                      <StatusBadge tone="pending" label="Pending" />
                      <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                        {enrollment.student.studentId}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {enrollment.batch.course.title} · {enrollment.batch.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.billingPeriod.periodMonth, 'month')} ·
                      Due {formatDate(payment.billingPeriod.dueDate)} · Ref{' '}
                      {payment.transactionReference ?? '—'}
                    </p>
                    {payment.proofUrl ? (
                      <a
                        href={payment.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
                      >
                        View proof
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                    <AmountCell
                      amount={payment.amount}
                      className="text-base font-semibold"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        className="min-h-11"
                        disabled={isBusy}
                        onClick={() => setRejectTarget(payment)}
                      >
                        Reject
                      </Button>
                      <Button
                        className="min-h-11"
                        disabled={isBusy}
                        onClick={() => {
                          void handleVerify(payment)
                        }}
                      >
                        {isBusy ? 'Verifying…' : 'Verify payment'}
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {payments && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            className="min-h-11"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <p className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="secondary"
            className="min-h-11"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Modal
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Reject this payment?"
        footer={
          <>
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => setRejectTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                void handleConfirmReject()
              }}
              disabled={busyId === rejectTarget?.id}
            >
              {busyId === rejectTarget?.id ? 'Rejecting…' : 'Reject payment'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Reject{' '}
          <span className="font-medium text-foreground">
            {rejectTarget?.billingPeriod.enrollment.student.fullName}
          </span>
          ’s proof? The student will need to submit again.
        </p>
      </Modal>
    </div>
  )
}
