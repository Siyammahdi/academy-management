'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CompassIcon, RefreshCwIcon } from 'lucide-react'

import { CourseCover } from '@/components/student/course-cover'
import { WorkspaceHero } from '@/components/layout/workspace-hero'
import { useStudentEnrollment } from '@/components/student/student-enrollment-provider'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { AuthUser } from '@/lib/auth'
import {
  getBatch,
  listBatches,
  listCourses,
  type BatchWithSeats,
  type Course,
  type EnrollmentWithBatch,
} from '@/lib/api-client'
import { formatDate, formatMoney } from '@/lib/format'
import {
  formatDhakaClock,
  formatDhakaToday,
} from '@/lib/student-dashboard'

interface OnboardingDashboardProps {
  user: AuthUser
  applications: EnrollmentWithBatch[]
  onRefresh: () => void
}

/**
 * Pre-enrollment home — encourage browse & enroll.
 * Uses public course/batch list endpoints already available to students.
 */
export function OnboardingDashboard({
  user,
  applications,
  onRefresh,
}: OnboardingDashboardProps) {
  const [clock, setClock] = useState(() => formatDhakaClock())
  const [openBatches, setOpenBatches] = useState<BatchWithSeats[] | null>(null)
  const [courseTitleById, setCourseTitleById] = useState<Map<string, string>>(
    () => new Map(),
  )
  const [recentCourses, setRecentCourses] = useState<Course[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { reload: reloadEnrollment } = useStudentEnrollment()

  async function reloadCatalog(): Promise<void> {
    try {
      const [batchPage, coursePage] = await Promise.all([
        listBatches({ status: 'enrolling', limit: 6 }),
        listCourses(1, 100),
      ])
      const enriched = await Promise.all(
        batchPage.data.slice(0, 4).map((batch) => getBatch(batch.id)),
      )
      setOpenBatches(enriched)
      setCourseTitleById(
        new Map(coursePage.data.map((c) => [c.id, c.title])),
      )
      setRecentCourses(
        [...coursePage.data]
          .filter((c) => c.status === 'active')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 4),
      )
      setError(null)
    } catch {
      setError('Available courses could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reloadCatalog().catch(() => {
      if (!cancelled) {
        setError('Available courses could not be loaded. Try again.')
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

  return (
    <div className="flex flex-col gap-5 sm:gap-7">
      <WorkspaceHero
        user={user}
        description="You are not enrolled in any course yet. Browse open batches to claim your seat."
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
              render={<Link href="/dashboard/enroll" />}
            >
              <CompassIcon />
              Browse courses
            </Button>
            <Button
              variant="ghost"
              className="hidden min-h-11 sm:inline-flex"
              onClick={() => {
                void reloadCatalog()
                void reloadEnrollment()
                onRefresh()
              }}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
          </div>
        }
      />

      <section className="rounded-xl bg-primary-wash px-4 py-5 sm:px-6">
        <p className="font-heading text-lg font-semibold text-foreground">
          You are not enrolled in any course yet
        </p>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Once a manager verifies your enrollment payment — or a gateway payment
          confirms — your classroom, homework, and courses unlock automatically.
        </p>
        <Button
          className="mt-4 min-h-11"
          render={<Link href="/dashboard/enroll" />}
        >
          <CompassIcon />
          Find a batch
        </Button>
      </section>

      {applications.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                Your applications
              </h2>
              <p className="text-sm text-muted-foreground">
                Waiting on payment verification
              </p>
            </div>
            <Button
              variant="ghost"
              className="min-h-11"
              render={<Link href="/dashboard/applications" />}
            >
              View all
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {applications.slice(0, 2).map((enrollment) => (
              <li
                key={enrollment.id}
                className="flex gap-3 overflow-hidden rounded-xl bg-muted/40 p-3"
              >
                <CourseCover
                  courseId={enrollment.batch.course.id}
                  title={enrollment.batch.course.title}
                  compact
                  className="size-16 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium text-foreground">
                    {enrollment.batch.course.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {enrollment.batch.name}
                  </p>
                  <StatusBadge tone="pending" label="Pending" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Open for enrollment
          </h2>
          <p className="text-sm text-muted-foreground">
            Batches accepting students right now
          </p>
        </div>
        {openBatches === null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : openBatches.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-4 py-5 text-sm text-muted-foreground">
            No batches are open for enrollment at the moment. Check back soon.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {openBatches.map((batch) => {
              const title =
                courseTitleById.get(batch.courseId) ?? 'Course'
              const seatsLeft = batch.seatsRemaining
              const isFull = seatsLeft <= 0
              return (
                <li
                  key={batch.id}
                  className="overflow-hidden rounded-xl bg-muted/40"
                >
                  <CourseCover
                    courseId={batch.courseId}
                    title={title}
                    className="aspect-video w-full"
                  />
                  <div className="space-y-2 p-4">
                    <p className="font-heading font-semibold text-foreground">
                      {title}
                    </p>
                    <p className="text-sm text-muted-foreground">{batch.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isFull
                        ? 'Full — try next batch.'
                        : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left · closes ${formatDate(batch.enrollmentClosesAt, 'short')}`}
                    </p>
                    <p className="text-sm text-foreground">
                      Entry from{' '}
                      <span className="font-medium tabular-nums">
                        {formatMoney(batch.enrollmentFee)}
                      </span>
                    </p>
                    <Button
                      className="min-h-11 w-full"
                      render={<Link href="/dashboard/enroll" />}
                      disabled={isFull}
                    >
                      <CompassIcon />
                      {isFull ? 'Full' : 'View & enroll'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {recentCourses && recentCourses.length > 0 ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Recently added courses
            </h2>
            <p className="text-sm text-muted-foreground">
              Explore the catalogue — enroll when a batch opens
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {recentCourses.map((course) => (
              <li
                key={course.id}
                className="overflow-hidden rounded-xl bg-muted/40"
              >
                <CourseCover
                  courseId={course.id}
                  title={course.title}
                  className="aspect-square w-full"
                  compact
                />
                <div className="space-y-1 p-3">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {course.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(course.enrollmentFee)} enrollment
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
