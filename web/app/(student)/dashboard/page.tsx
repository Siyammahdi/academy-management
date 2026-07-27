'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardListIcon,
  CompassIcon,
  LinkIcon,
  RefreshCwIcon,
  VideoIcon,
  WalletIcon,
} from 'lucide-react'

import { ClassroomSpotlight } from '@/components/student/classroom-spotlight'
import { CourseShelf } from '@/components/student/course-shelf'
import { DashboardMetrics } from '@/components/student/dashboard-metrics'
import { DashboardSkeleton } from '@/components/student/dashboard-skeleton'
import { DuesStrip } from '@/components/student/dues-strip'
import { HomeworkBoard } from '@/components/student/homework-board'
import { OnboardingDashboard } from '@/components/student/onboarding-dashboard'
import { RecordingsTimeline } from '@/components/student/recordings-timeline'
import { useStudentEnrollment } from '@/components/student/student-enrollment-provider'
import { WorkspaceHero } from '@/components/layout/workspace-hero'
import { PaymentModal } from '@/components/payments/payment-modal'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { isDueToday, isPastDue } from '@/lib/homework-status'
import { getMe, type AuthUser } from '@/lib/auth'
import {
  activeClassrooms,
  formatDhakaClock,
  formatDhakaToday,
  openDuePeriods,
} from '@/lib/student-dashboard'
import {
  listMyBillingPeriods,
  listMyHomework,
  listMyRecordings,
  type BillingPeriodWithContext,
  type HomeworkWithContext,
  type RecordingWithContext,
} from '@/lib/api-client'
import { hasActiveEnrollment } from '@/lib/enrollment-access'

interface DashboardData {
  user: AuthUser
  periods: BillingPeriodWithContext[]
  homework: HomeworkWithContext[]
  recordings: RecordingWithContext[]
}

async function fetchEnrolledDashboard(): Promise<DashboardData> {
  const [user, periodResult, homework, recordings] = await Promise.all([
    getMe(),
    listMyBillingPeriods(undefined, 1, 100),
    listMyHomework(),
    listMyRecordings(),
  ])
  return {
    user,
    periods: periodResult.data,
    homework,
    recordings,
  }
}

export default function StudentDashboardPage() {
  const {
    enrollments,
    applications,
    loading: enrollmentLoading,
    reload: reloadEnrollment,
  } = useStudentEnrollment()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payingPeriod, setPayingPeriod] =
    useState<BillingPeriodWithContext | null>(null)
  const [clock, setClock] = useState(() => formatDhakaClock())
  const [onboardingUser, setOnboardingUser] = useState<AuthUser | null>(null)

  const isEnrolled = !enrollmentLoading && hasActiveEnrollment(enrollments)
  const enrollmentKey = enrollments
    .map((e) => `${e.id}:${e.status}`)
    .join(',')

  async function reload(): Promise<void> {
    try {
      if (!hasActiveEnrollment(enrollments)) {
        setOnboardingUser(await getMe())
        await reloadEnrollment()
        setError(null)
        return
      }
      setData(await fetchEnrolledDashboard())
      setError(null)
    } catch {
      setError('Your dashboard could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    if (enrollmentLoading) return
    let cancelled = false

    if (!hasActiveEnrollment(enrollments)) {
      getMe()
        .then((user) => {
          if (!cancelled) {
            setOnboardingUser(user)
            setData(null)
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
    }

    fetchEnrolledDashboard()
      .then((next) => {
        if (!cancelled) {
          setData(next)
          setOnboardingUser(null)
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
    // enrollmentKey captures id+status changes without depending on array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enrollments read via key
  }, [enrollmentLoading, enrollmentKey])

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

  if (error && !data && !onboardingUser) {
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

  if (
    enrollmentLoading ||
    (!isEnrolled && !onboardingUser) ||
    (isEnrolled && !data)
  ) {
    return <DashboardSkeleton />
  }

  if (!isEnrolled && onboardingUser) {
    return (
      <OnboardingDashboard
        user={onboardingUser}
        applications={applications}
        onRefresh={() => {
          void reload()
        }}
      />
    )
  }

  if (!data) {
    return <DashboardSkeleton />
  }

  const { user, periods, homework, recordings } = data
  const openDues = openDuePeriods(periods)
  const homeworkDueToday = homework.filter((h) => isDueToday(h.dueDate))
  const pastDueHomeworkCount = homework.filter((h) =>
    isPastDue(h.dueDate),
  ).length
  const classrooms = activeClassrooms(enrollments)
  const firstOpenDue = openDues[0] ?? null
  const activeCount = enrollments.filter((e) => e.status === 'active').length

  const sortedEnrollments = [...enrollments].sort((a, b) => {
    const rank = (s: string) =>
      s === 'active' ? 0 : s === 'pending' ? 1 : 2
    const byStatus = rank(a.status) - rank(b.status)
    if (byStatus !== 0) return byStatus
    return a.batch.course.title.localeCompare(b.batch.course.title)
  })

  const quickActions = [
    {
      href: '/dashboard/classroom',
      label: 'Join your class',
      icon: LinkIcon,
    },
    {
      href: '/dashboard/homework',
      label: 'Your homework',
      icon: ClipboardListIcon,
    },
    {
      href: '/dashboard/recordings',
      label: 'Your recordings',
      icon: VideoIcon,
    },
    {
      href: firstOpenDue ? '/dashboard/dues' : '/dashboard/courses',
      label: firstOpenDue ? 'Your payment status' : 'Your courses',
      icon: firstOpenDue ? WalletIcon : CompassIcon,
    },
  ]

  return (
    <div className="flex flex-col gap-5 sm:gap-7">
      <WorkspaceHero
        user={user}
        description="Your classroom, homework, and dues — each course stays separate, never mixed into one total."
        aside={
          <div className="shrink-0 rounded-xl bg-background/80 px-3 py-2 text-right">
            <p className="font-heading text-base font-semibold tabular-nums text-foreground sm:text-lg">
              {clock}
            </p>
            <p className="max-w-28 text-xs leading-tight text-muted-foreground">
              {formatDhakaToday()}
            </p>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Button
              className="min-h-11 flex-1 sm:flex-none"
              render={<Link href="/dashboard/classroom" />}
            >
              <LinkIcon />
              Join class
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 flex-1 sm:flex-none"
              render={<Link href="/dashboard/enroll" />}
            >
              <CompassIcon />
              Enroll
            </Button>
            <Button
              variant="ghost"
              className="hidden min-h-11 sm:inline-flex"
              onClick={() => {
                void reload()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
          </div>
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

      <DashboardMetrics
        metrics={[
          {
            key: 'courses',
            label: 'Courses',
            value: activeCount,
            hint: activeCount === 1 ? 'Active shelf' : 'On your shelf',
            tone: 'brand',
            href: '/dashboard/courses',
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
            label: 'Due today',
            value: homeworkDueToday.length,
            hint:
              pastDueHomeworkCount > 0
                ? `${pastDueHomeworkCount} past due`
                : 'Homework',
            tone:
              homeworkDueToday.length > 0 || pastDueHomeworkCount > 0
                ? 'warm'
                : 'wash',
            href: '/dashboard/homework',
          },
          {
            key: 'recordings',
            label: 'Recordings',
            value: recordings.length,
            hint: 'By class day',
            tone: 'deep',
            href: '/dashboard/recordings',
          },
        ]}
      />

      <ClassroomSpotlight classrooms={classrooms} />

      <section className="min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Quick actions
          </h2>
          <p className="text-sm text-muted-foreground">
            The actions you reach for most often
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.label}
                variant="secondary"
                className="min-h-11 justify-start"
                render={<Link href={action.href} />}
              >
                <Icon />
                {action.label}
              </Button>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <HomeworkBoard
          items={homework}
          limit={5}
          viewAllHref="/dashboard/homework"
        />
        <DuesStrip periods={periods} onPay={setPayingPeriod} />
      </div>

      <RecordingsTimeline
        items={recordings}
        viewAllHref="/dashboard/recordings"
      />
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Your courses
            </h2>
            <p className="text-sm text-muted-foreground">
              Swipe the shelf · join, copy, or pay per course
            </p>
          </div>
          <Button
            variant="ghost"
            className="min-h-11"
            render={<Link href="/dashboard/courses" />}
          >
            View all
          </Button>
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
