'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'

import { CourseCover } from '@/components/student/course-cover'
import { StatusBadge } from '@/components/money/status-badge'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { useStudentEnrollment } from '@/components/student/student-enrollment-provider'
import { PaymentModal } from '@/components/payments/payment-modal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import {
  enrollInBatch,
  getBatch,
  listBatches,
  listCourses,
  type BatchWithSeats,
  type Course,
} from '@/lib/api-client'
import { formatDate, formatMoney } from '@/lib/format'

function enrollErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.body.error === 'BATCH_FULL') {
      return 'Full — try next batch.'
    }
    if (err.body.error === 'ENROLLMENT_WINDOW_CLOSED') {
      return 'Enrollment for this batch has closed.'
    }
    if (err.body.error === 'ALREADY_ENROLLED') {
      return "You're already enrolled in this batch."
    }
  }
  return 'Enrollment could not be completed. Try again or contact an admin.'
}

interface PendingPaymentTarget {
  billingPeriodId: string
  outstanding: string
  periodLabel: string
}

/**
 * Student — Browse & Enroll
 * Open batches + enroll, then pay the first period in the same step.
 */
export default function StudentEnrollPage() {
  const { hasActive, reload: reloadEnrollment } = useStudentEnrollment()
  const [batches, setBatches] = useState<BatchWithSeats[] | null>(null)
  const [courseById, setCourseById] = useState<Map<string, Course>>(
    () => new Map(),
  )
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [paymentTarget, setPaymentTarget] =
    useState<PendingPaymentTarget | null>(null)

  async function reload(): Promise<void> {
    try {
      const [list, courseList] = await Promise.all([
        listBatches({ open: true, limit: 50 }),
        listCourses(1, 100),
      ])
      const enriched = await Promise.all(
        list.data.map((batch) => getBatch(batch.id)),
      )
      setBatches(enriched)
      setCourseById(new Map(courseList.data.map((c) => [c.id, c])))
      setError(null)
    } catch {
      setError('Open batches could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Open batches could not be loaded. Try again.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleEnroll(batch: BatchWithSeats): Promise<void> {
    setRowErrors((prev) => ({ ...prev, [batch.id]: '' }))
    setBusyId(batch.id)
    try {
      const result = await enrollInBatch(batch.id)
      setEnrolledIds((prev) => new Set(prev).add(batch.id))
      await reloadEnrollment()
      const courseTitle =
        courseById.get(batch.courseId)?.title ?? 'Course'
      setPaymentTarget({
        billingPeriodId: result.firstPeriod.id,
        outstanding: String(result.firstPeriod.amountOwed),
        periodLabel: `${courseTitle} · ${batch.name} · entry + first month`,
      })
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [batch.id]: enrollErrorMessage(err),
      }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Discover"
        title="Browse Courses"
        description="Pick an open batch, enroll, and pay in one flow. Fees shown are the batch snapshot — never a combined total."
        actions={
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
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      {!batches && !error ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {batches && batches.length === 0 ? (
        <div className="rounded-xl bg-muted/50 px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-foreground">
            No open batches
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing is accepting enrollments right now. Check back later.
          </p>
          <Button
            className="mt-4 min-h-11"
            variant="secondary"
            render={
              <Link href={hasActive ? '/dashboard/courses' : '/dashboard'} />
            }
          >
            {hasActive ? 'Go to Your Courses' : 'Back to dashboard'}
          </Button>
        </div>
      ) : null}

      {batches && batches.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {batches.map((batch) => {
            const isFull = batch.seatsRemaining <= 0
            const isEnrolled = enrolledIds.has(batch.id)
            const rowError = rowErrors[batch.id]
            const course = courseById.get(batch.courseId)
            const courseTitle = course?.title ?? 'Course'
            return (
              <li
                key={batch.id}
                className="overflow-hidden rounded-xl bg-muted/50"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <CourseCover
                    courseId={batch.courseId}
                    title={courseTitle}
                    hasThumbnail={course?.hasThumbnail}
                    updatedAt={course?.updatedAt}
                    compact
                    className="size-16 shrink-0 rounded-xl sm:size-20"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-base font-semibold text-foreground">
                        {courseTitle}
                      </h2>
                      <StatusBadge tone="pending" label="Enrolling" />
                    </div>
                    <p className="text-sm text-muted-foreground">{batch.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Enrollment fee {formatMoney(batch.enrollmentFee)} · Monthly{' '}
                      {formatMoney(batch.monthlyFee)} · Closes{' '}
                      <span className="tabular-nums">
                        {formatDate(batch.enrollmentClosesAt)}
                      </span>
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {isFull
                        ? 'Full — try next batch.'
                        : `${batch.seatsRemaining} of ${batch.capacity} seats left`}
                    </p>
                    {rowError ? (
                      <p className="text-sm text-status-overdue" role="alert">
                        {rowError}
                      </p>
                    ) : null}
                  </div>
                  {isEnrolled ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <StatusBadge tone="pending" label="Pay to activate" />
                      <Button
                        className="min-h-11"
                        render={<Link href="/dashboard/applications" />}
                      >
                        Finish payment
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="min-h-11 shrink-0"
                      disabled={isFull || busyId === batch.id}
                      loading={busyId === batch.id}
                      onClick={() => {
                        void handleEnroll(batch)
                      }}
                    >
                      {busyId === batch.id ? 'Enrolling…' : 'Enroll & pay'}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

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
            void reloadEnrollment()
            toast.success(
              'Online payment unlocks class after bank confirmation — no teacher review. Manual payments wait for verification.',
            )
          }}
        />
      ) : null}
    </div>
  )
}
