'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CompassIcon, RefreshCwIcon } from 'lucide-react'

import { ClassroomSpotlight } from '@/components/student/classroom-spotlight'
import { CourseShelf } from '@/components/student/course-shelf'
import { DashboardMetrics } from '@/components/student/dashboard-metrics'
import { DashboardSkeleton } from '@/components/student/dashboard-skeleton'
import { DuesStrip } from '@/components/student/dues-strip'
import { HomeworkBoard } from '@/components/student/homework-board'
import { RecordingsTimeline } from '@/components/student/recordings-timeline'
import { PaymentModal } from '@/components/payments/payment-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { isPastDue } from '@/lib/homework-status'
import { getMe, type AuthUser } from '@/lib/auth'
import {
  activeClassrooms,
  formatDhakaClock,
  formatDhakaToday,
  greetingForDhaka,
  openDuePeriods,
} from '@/lib/student-dashboard'
import {
  listMyBillingPeriods,
  listMyEnrollments,
  listMyHomework,
  listMyRecordings,
  type BillingPeriodWithContext,
  type EnrollmentWithBatch,
  type HomeworkWithContext,
  type RecordingWithContext,
} from '@/lib/api-client'

interface DashboardData {
  user: AuthUser
  enrollments: EnrollmentWithBatch[]
  periods: BillingPeriodWithContext[]
  homework: HomeworkWithContext[]
  recordings: RecordingWithContext[]
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [user, enrollmentResult, periodResult, homework, recordings] =
    await Promise.all([
      getMe(),
      listMyEnrollments(1, 100),
      listMyBillingPeriods(undefined, 1, 100),
      listMyHomework(),
      listMyRecordings(),
    ])
  return {
    user,
    enrollments: enrollmentResult.data,
    periods: periodResult.data,
    homework,
    recordings,
  }
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payingPeriod, setPayingPeriod] =
    useState<BillingPeriodWithContext | null>(null)
  const [clock, setClock] = useState(() => formatDhakaClock())

  async function reload(): Promise<void> {
    try {
      const next = await fetchDashboardData()
      setData(next)
      setError(null)
    } catch {
      setError('Your dashboard could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchDashboardData()
      .then((next) => {
        if (!cancelled) {
          setData(next)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your dashboard could not be loaded. Try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(formatDhakaClock())
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])

  function currentPeriodFor(
    enrollmentId: string,
  ): BillingPeriodWithContext | undefined {
    return data?.periods
      .filter((p) => p.enrollmentId === enrollmentId)
      .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth))[0]
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-start gap-4 py-8">
        <div
          role="alert"
          className="w-full rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
        <Button
          className="min-h-11 w-full sm:w-auto"
          variant="outline"
          onClick={() => {
            void reload()
          }}
        >
          <RefreshCwIcon />
          Try again
        </Button>
      </div>
    )
  }

  if (!data) {
    return <DashboardSkeleton />
  }

  const { user, enrollments, periods, homework, recordings } = data
  const openDues = openDuePeriods(periods)
  const pastDueHomeworkCount = homework.filter((h) =>
    isPastDue(h.dueDate),
  ).length
  const classrooms = activeClassrooms(enrollments)
  const displayName = user.email.split('@')[0] ?? user.email

  const sortedEnrollments = [...enrollments].sort((a, b) => {
    const rank = (s: string) =>
      s === 'active' ? 0 : s === 'pending' ? 1 : 2
    const byStatus = rank(a.status) - rank(b.status)
    if (byStatus !== 0) return byStatus
    return a.batch.course.title.localeCompare(b.batch.course.title)
  })

  return (
    <div className="flex flex-col gap-5 sm:gap-7">
      {/* Compact mobile hero */}
      <header className="relative overflow-hidden rounded-xl bg-primary-wash">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full bg-primary/20 sm:size-48"
        />

        <div className="relative space-y-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-primary-strong sm:text-sm">
                  {greetingForDhaka()}
                </p>
                {user.studentId ? (
                  <Badge className="bg-primary text-primary-foreground">
                    {user.studentId}
                  </Badge>
                ) : null}
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Hello, {displayName}
              </h1>
              <p className="hidden max-w-lg text-sm leading-relaxed text-muted-foreground sm:block">
                Join class, clear homework, catch recordings — dues stay per
                course, never mixed into one total.
              </p>
            </div>

            <div className="shrink-0 rounded-xl bg-background/80 px-3 py-2 text-right">
              <p className="font-heading text-base font-semibold tabular-nums text-foreground sm:text-lg">
                {clock}
              </p>
              <p className="max-w-28 text-xs leading-tight text-muted-foreground">
                {formatDhakaToday()}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="min-h-11 flex-1 sm:flex-none"
              render={<Link href="/dashboard/batches" />}
            >
              <CompassIcon />
              Browse
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 flex-1 sm:flex-none"
              onClick={() => {
                void reload()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      <DashboardMetrics
        metrics={[
          {
            key: 'courses',
            label: 'Courses',
            value: enrollments.length,
            hint:
              enrollments.length === 1 ? 'Active shelf' : 'On your shelf',
            tone: 'brand',
          },
          {
            key: 'dues',
            label: 'Open dues',
            value: openDues.length,
            hint: openDues.length === 0 ? 'All settled' : 'Needs a look',
            tone: openDues.length > 0 ? 'warm' : 'calm',
            href: '/dashboard/dues',
          },
          {
            key: 'homework',
            label: 'Homework',
            value: homework.length,
            hint:
              pastDueHomeworkCount > 0
                ? `${pastDueHomeworkCount} past due`
                : 'To-do list',
            tone: pastDueHomeworkCount > 0 ? 'warm' : 'wash',
          },
          {
            key: 'recordings',
            label: 'Recordings',
            value: recordings.length,
            hint: 'By class day',
            tone: 'deep',
          },
        ]}
      />

      <ClassroomSpotlight classrooms={classrooms} />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <HomeworkBoard items={homework} />
        <DuesStrip periods={periods} onPay={setPayingPeriod} />
      </div>

      <RecordingsTimeline items={recordings} />

      <section className="space-y-3 sm:space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Your courses
          </h2>
          <p className="text-sm text-muted-foreground">
            Swipe the shelf · join, copy, or pay per course
          </p>
        </div>
        <CourseShelf
          enrollments={sortedEnrollments}
          periodFor={currentPeriodFor}
          onPay={setPayingPeriod}
        />
      </section>

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
