'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RefreshCwIcon } from 'lucide-react'

import { AmountCell } from '@/components/money/amount-cell'
import { StatusBadge } from '@/components/money/status-badge'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { Button } from '@/components/ui/button'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listMyPayments,
  type PaymentStatus,
  type PaymentWithContext,
} from '@/lib/api-client'
import { formatDate } from '@/lib/format'

const PAYMENT_STATUS: Record<
  PaymentStatus,
  { tone: 'paid' | 'pending' | 'overdue' | 'neutral'; label: string }
> = {
  pending: { tone: 'pending', label: 'Pending' },
  verified: { tone: 'paid', label: 'Verified' },
  rejected: { tone: 'overdue', label: 'Rejected' },
  expired: { tone: 'neutral', label: 'Expired' },
}

/**
 * Student — Payment History
 * GET /me/payments across enrollments.
 */
export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithContext[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  async function reload(): Promise<void> {
    try {
      const result = await listMyPayments(1, 100)
      setPayments(result.data)
      setError(null)
    } catch {
      setError('Your payment history could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) {
        setError('Your payment history could not be loaded. Try again.')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!payments) return []
    if (statusFilter === 'all') return payments
    return payments.filter((p) => p.status === statusFilter)
  }, [payments, statusFilter])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Payments"
        title="Payment History"
        description="Every payment you submitted — gateway and manual — across all enrollments."
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
              render={<Link href="/dashboard/dues" />}
            >
              Payment status
            </Button>
          </>
        }
      />

      <FilterDropdown
        className="w-full sm:max-w-xs"
        label="Status"
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: 'all', label: 'All statuses' },
          { value: 'pending', label: 'Pending' },
          { value: 'verified', label: 'Verified' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'expired', label: 'Expired' },
        ]}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!payments && !error ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {payments && payments.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No payments yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you pay a due, it appears here.
          </p>
          <Button
            className="mt-4 min-h-11"
            render={<Link href="/dashboard/dues" />}
          >
            Open payment status
          </Button>
        </div>
      ) : null}

      {payments && payments.length > 0 && filtered.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No matching payments
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different status filter.
          </p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {filtered.map((payment) => {
              const status = PAYMENT_STATUS[payment.status]
              const { batch } = payment.billingPeriod.enrollment
              return (
                <li
                  key={payment.id}
                  className="rounded-xl bg-muted/50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading font-semibold text-foreground">
                      {batch.course.title}
                    </p>
                    <StatusBadge tone={status.tone} label={status.label} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {batch.name} ·{' '}
                    {payment.method === 'gateway' ? 'Online' : 'Manual'}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <AmountCell
                      amount={payment.amount}
                      className="text-base font-semibold"
                    />
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="hidden overflow-x-auto rounded-xl bg-muted/50 md:block">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Course · Batch
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Method
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => {
                  const status = PAYMENT_STATUS[payment.status]
                  const { batch } = payment.billingPeriod.enrollment
                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-4 py-3 text-sm text-foreground">
                        {batch.course.title} · {batch.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {payment.method === 'gateway' ? 'Online' : 'Manual'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AmountCell amount={payment.amount} />
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={status.tone}
                          label={status.label}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
