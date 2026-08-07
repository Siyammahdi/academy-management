'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CompassIcon, RefreshCwIcon, WalletIcon } from 'lucide-react'
import { toast } from 'sonner'

import { CourseCover } from '@/components/student/course-cover'
import { StatusBadge } from '@/components/money/status-badge'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { useStudentEnrollment } from '@/components/student/student-enrollment-provider'
import { PaymentModal } from '@/components/payments/payment-modal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listMyBillingPeriods,
  type BillingPeriodWithContext,
  type EnrollmentWithBatch,
} from '@/lib/api-client'
import { formatDate, formatMoney } from '@/lib/format'

/**
 * Pending enrollments (ENR-07) — pay here to activate the seat.
 */
export default function StudentApplicationsPage() {
  const { applications, loading, error, reload, hasPending } =
    useStudentEnrollment()

  const [ready, setReady] = useState(false)
  const [periods, setPeriods] = useState<BillingPeriodWithContext[] | null>(
    null,
  )
  const [periodsError, setPeriodsError] = useState<string | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<{
    billingPeriodId: string
    outstanding: string
    periodLabel: string
  } | null>(null)
  const [loadingPayId, setLoadingPayId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) setReady(true)
  }, [loading])

  async function reloadPeriods(): Promise<void> {
    try {
      const result = await listMyBillingPeriods(undefined, 1, 100)
      setPeriods(result.data)
      setPeriodsError(null)
    } catch {
      setPeriodsError('Your dues could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    if (!hasPending) {
      setPeriods([])
      return
    }
    let cancelled = false
    listMyBillingPeriods(undefined, 1, 100)
      .then((result) => {
        if (!cancelled) {
          setPeriods(result.data)
          setPeriodsError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeriodsError('Your dues could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [hasPending, applications.length])

  function openPeriodForEnrollment(enrollment: EnrollmentWithBatch): void {
    setLoadingPayId(enrollment.id)
    const period =
      periods?.find(
        (p) =>
          p.enrollmentId === enrollment.id &&
          (p.status === 'unpaid' || p.status === 'partially_paid'),
      ) ?? null

    if (!period) {
      toast.error(
        'No open due was found for this application. Refresh and try again.',
      )
      setLoadingPayId(null)
      return
    }

    setPaymentTarget({
      billingPeriodId: period.id,
      outstanding: period.outstanding,
      periodLabel: `${enrollment.batch.course.title} · ${enrollment.batch.name} · entry + first month`,
    })
    setLoadingPayId(null)
  }

  if (!ready || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Applications"
        title="My Applications"
        description="Finish payment here to activate your seat. Online payment unlocks class after bank confirmation — no teacher verification. Manual payment waits for a teacher to verify your proof."
        actions={
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => {
              void reload()
              void reloadPeriods()
            }}
          >
            <RefreshCwIcon />
            Refresh
          </Button>
        }
      />

      {error || periodsError ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error ?? periodsError}
        </div>
      ) : null}

      {!hasPending ? (
        <div className="rounded-xl bg-muted/50 px-4 py-6 sm:px-6">
          <p className="font-heading text-lg font-semibold text-foreground">
            No open applications
          </p>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            When you enroll and still need to pay, the application appears here
            until payment activates the enrollment.
          </p>
          <Button
            className="mt-4 min-h-11"
            render={<Link href="/dashboard/enroll" />}
          >
            <CompassIcon />
            Browse courses
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {applications.map((enrollment) => {
            const period =
              periods?.find(
                (p) =>
                  p.enrollmentId === enrollment.id &&
                  (p.status === 'unpaid' ||
                    p.status === 'partially_paid' ||
                    p.status === 'pending'),
              ) ?? null
            return (
              <li
                key={enrollment.id}
                className="overflow-hidden rounded-xl bg-muted/40"
              >
                <CourseCover
                  courseId={enrollment.batch.course.id}
                  title={enrollment.batch.course.title}
                  hasThumbnail={enrollment.batch.course.hasThumbnail}
                  updatedAt={enrollment.batch.course.updatedAt}
                  className="aspect-video w-full"
                />
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-foreground">
                        {enrollment.batch.course.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {enrollment.batch.name}
                      </p>
                    </div>
                    <StatusBadge
                      tone="pending"
                      label={
                        period?.status === 'pending'
                          ? 'Awaiting verification'
                          : 'Payment needed'
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applied {formatDate(enrollment.enrolledAt, 'short')}
                  </p>
                  {period && period.status !== 'pending' ? (
                    <p className="text-sm font-medium tabular-nums text-foreground">
                      Due {formatMoney(period.outstanding)}
                    </p>
                  ) : null}
                  {period?.status === 'pending' ? (
                    <p className="text-sm text-muted-foreground">
                      A payment is already waiting for teacher verification.
                    </p>
                  ) : (
                    <Button
                      className="min-h-11 w-full"
                      loading={loadingPayId === enrollment.id}
                      disabled={!periods}
                      onClick={() => openPeriodForEnrollment(enrollment)}
                    >
                      <WalletIcon />
                      Pay now
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {paymentTarget ? (
        <PaymentModal
          isOpen
          purpose="enrollment"
          onClose={() => setPaymentTarget(null)}
          billingPeriodId={paymentTarget.billingPeriodId}
          periodLabel={paymentTarget.periodLabel}
          outstanding={paymentTarget.outstanding}
          onSubmitted={() => {
            setPaymentTarget(null)
            void reload()
            void reloadPeriods()
            toast.success(
              'If you paid online, class is unlocked after bank confirmation. Manual payments wait for teacher verification.',
            )
          }}
        />
      ) : null}
    </div>
  )
}
