'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCwIcon } from 'lucide-react'

import { CourseShelf } from '@/components/student/course-shelf'
import { StudentPageHeader } from '@/components/student/student-page-header'
import { PaymentModal } from '@/components/payments/payment-modal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getMe, type AuthUser } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import {
  listMyBillingPeriods,
  listMyEnrollments,
  type BillingPeriodWithContext,
  type EnrollmentWithBatch,
} from '@/lib/api-client'
import { possessiveCoursesTitle } from '@/lib/user-display'

/**
 * Student — Your Courses
 * Enrolled batches from GET /me/enrollments.
 */
export default function StudentCoursesPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentWithBatch[] | null>(
    null,
  )
  const [periods, setPeriods] = useState<BillingPeriodWithContext[]>([])
  const [error, setError] = useState<string | null>(null)
  const [payingPeriod, setPayingPeriod] =
    useState<BillingPeriodWithContext | null>(null)

  async function reload(): Promise<void> {
    try {
      const [me, enrollmentResult, periodResult] = await Promise.all([
        getMe(),
        listMyEnrollments(1, 100),
        listMyBillingPeriods(undefined, 1, 100),
      ])
      setUser(me)
      setEnrollments(enrollmentResult.data)
      setPeriods(periodResult.data)
      setError(null)
    } catch {
      setError('Your courses could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reload().catch(() => {
      if (!cancelled) setError('Your courses could not be loaded. Try again.')
    })
    return () => {
      cancelled = true
    }
  }, [])

  function currentPeriodFor(
    enrollmentId: string,
  ): BillingPeriodWithContext | undefined {
    return periods
      .filter((p) => p.enrollmentId === enrollmentId)
      .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth))[0]
  }

  const sorted = enrollments
    ? [...enrollments].sort((a, b) => {
        const rank = (s: string) =>
          s === 'active' ? 0 : s === 'pending' ? 1 : 2
        const byStatus = rank(a.status) - rank(b.status)
        if (byStatus !== 0) return byStatus
        return a.batch.course.title.localeCompare(b.batch.course.title)
      })
    : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <StudentPageHeader
        eyebrow="Learning"
        title={user ? possessiveCoursesTitle(user) : 'Your Courses'}
        description="Batches you are enrolled in. Join class, copy the link, or pay an open due — each course stays separate."
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
              className="min-h-11"
              render={<Link href="/dashboard/enroll" />}
            >
              Browse & enroll
            </Button>
          </>
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

      {!sorted && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {sorted ? (
        <CourseShelf
          enrollments={sorted}
          periodFor={currentPeriodFor}
          onPay={setPayingPeriod}
        />
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
