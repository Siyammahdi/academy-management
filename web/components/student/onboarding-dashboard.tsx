'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CompassIcon,
  RefreshCwIcon,
  SparklesIcon,
  WalletIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { CourseCover } from '@/components/student/course-cover'
import { WorkspaceHero } from '@/components/layout/workspace-hero'
import { useStudentEnrollment } from '@/components/student/student-enrollment-provider'
import { PaymentModal } from '@/components/payments/payment-modal'
import { StatusBadge } from '@/components/money/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import type { AuthUser } from '@/lib/auth'
import {
  enrollInBatch,
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
import { cn } from '@/lib/utils'

interface OnboardingDashboardProps {
  user: AuthUser
  applications: EnrollmentWithBatch[]
  onRefresh: () => void
}

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

const NEXT_STEPS = [
  {
    step: '01',
    title: 'Pick a program',
    body: 'Featured courses below are the ones admissions is promoting right now.',
  },
  {
    step: '02',
    title: 'Enroll & pay',
    body: 'One step — claim a seat, then pay online or submit proof in the same flow.',
  },
  {
    step: '03',
    title: 'Class unlocks',
    body: 'Online payment activates when the bank confirms. Manual payment waits for manager verification.',
  },
] as const

/**
 * Pre-enrollment home — featured programs first, clear path to enroll.
 */
export function OnboardingDashboard({
  user,
  applications,
  onRefresh,
}: OnboardingDashboardProps) {
  const [clock, setClock] = useState(() => formatDhakaClock())
  const [featured, setFeatured] = useState<Course[] | null>(null)
  const [batchByCourseId, setBatchByCourseId] = useState<
    Map<string, BatchWithSeats>
  >(() => new Map())
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<{
    billingPeriodId: string
    outstanding: string
    periodLabel: string
  } | null>(null)
  const { reload: reloadEnrollment } = useStudentEnrollment()

  async function reloadCatalog(): Promise<void> {
    try {
      const [featuredPage, batchPage] = await Promise.all([
        listCourses(1, 12, { featured: true }),
        listBatches({ open: true, limit: 50 }),
      ])
      const enriched = await Promise.all(
        batchPage.data.map((batch) => getBatch(batch.id).catch(() => null)),
      )
      const openBatches = enriched.filter(
        (batch): batch is BatchWithSeats => batch !== null,
      )
      const nextMap = new Map<string, BatchWithSeats>()
      for (const batch of openBatches) {
        const existing = nextMap.get(batch.courseId)
        if (
          !existing ||
          (existing.seatsRemaining <= 0 && batch.seatsRemaining > 0)
        ) {
          nextMap.set(batch.courseId, batch)
        }
      }
      setFeatured(featuredPage.data)
      setBatchByCourseId(nextMap)
      setError(null)
    } catch {
      setError('Featured courses could not be loaded. Try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    reloadCatalog().catch(() => {
      if (!cancelled) {
        setError('Featured courses could not be loaded. Try again.')
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

  async function handleEnroll(
    batch: BatchWithSeats,
    course: Course,
  ): Promise<void> {
    setBusyId(batch.id)
    try {
      const result = await enrollInBatch(batch.id)
      await reloadEnrollment()
      onRefresh()
      setPaymentTarget({
        billingPeriodId: result.firstPeriod.id,
        outstanding: String(result.firstPeriod.amountOwed),
        periodLabel: `${course.title} · ${batch.name} · entry + first month`,
      })
    } catch (err) {
      toast.error(enrollErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const openFeaturedCount =
    featured?.filter((course) => {
      const batch = batchByCourseId.get(course.id)
      return Boolean(batch && batch.seatsRemaining > 0)
    }).length ?? 0

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <WorkspaceHero
        user={user}
        description="Your account is ready. Choose a featured program, enroll in an open batch, then complete payment to unlock class."
        aside={
          <div className="hidden shrink-0 rounded-xl bg-background/80 px-3 py-2 text-right sm:block">
            <p className="font-heading text-base font-semibold tabular-nums text-foreground sm:text-lg">
              {clock}
            </p>
            <p className="max-w-28 text-xs leading-tight text-muted-foreground">
              {formatDhakaToday()}
            </p>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11 flex-1 sm:flex-none"
              render={<Link href="#featured-programs" />}
            >
              <SparklesIcon />
              See featured programs
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 flex-1 sm:flex-none"
              render={<Link href="/dashboard/enroll" />}
            >
              <CompassIcon />
              Browse all batches
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

      <section className="relative overflow-hidden rounded-3xl bg-primary-wash px-5 py-6 sm:px-8 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-1/3 size-48 rounded-full bg-primary-strong/10"
        />
        <div className="relative grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
              Getting started
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Not enrolled yet — that is expected
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Classroom, homework, and recordings unlock after your enrollment
              payment is verified. Until then, this home is for choosing a
              program and claiming a seat.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            <div className="rounded-2xl bg-background/70 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground">
                Featured open
              </p>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
                {featured === null ? '—' : openFeaturedCount}
              </p>
            </div>
            <div className="rounded-2xl bg-background/70 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground">
                Applications
              </p>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
                {applications.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            How enrollment works
          </h2>
          <p className="text-sm text-muted-foreground">
            Three short steps — same path every student follows
          </p>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {NEXT_STEPS.map((item) => (
            <li
              key={item.step}
              className="rounded-2xl bg-muted/50 px-4 py-5 sm:px-5"
            >
              <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
                Step {item.step}
              </p>
              <p className="mt-2 font-heading text-base font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {applications.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                Waiting on payment
              </h2>
              <p className="text-sm text-muted-foreground">
                Finish these applications to unlock class
              </p>
            </div>
            <Button
              variant="ghost"
              className="min-h-11"
              render={<Link href="/dashboard/applications" />}
            >
              View all
              <ArrowRightIcon />
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {applications.slice(0, 2).map((enrollment) => (
              <li
                key={enrollment.id}
                className="flex gap-4 overflow-hidden rounded-2xl bg-status-pending-bg/60 p-4"
              >
                <CourseCover
                  courseId={enrollment.batch.course.id}
                  title={enrollment.batch.course.title}
                  hasThumbnail={enrollment.batch.course.hasThumbnail}
                  updatedAt={enrollment.batch.course.updatedAt}
                  compact
                  className="size-20 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="space-y-1">
                    <p className="truncate font-heading font-semibold text-foreground">
                      {enrollment.batch.course.title}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {enrollment.batch.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="pending" label="Pending payment" />
                    <Button
                      size="sm"
                      className="min-h-9"
                      render={<Link href="/dashboard/applications" />}
                    >
                      <WalletIcon />
                      Continue
                    </Button>
                  </div>
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

      <section id="featured-programs" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl space-y-1">
            <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
              Featured
            </p>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Open for enrollment
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Programs marked featured by admissions — not a full catalogue dump.
              Pick one to see fees, seats, and enroll.
            </p>
          </div>
          <Button
            variant="outline"
            className="min-h-11"
            render={<Link href="/dashboard/enroll" />}
          >
            All open batches
          </Button>
        </div>

        {featured === null ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        ) : featured.length === 0 ? (
          <div className="rounded-3xl bg-muted/50 px-6 py-10 text-center sm:px-8">
            <CheckCircle2Icon className="mx-auto size-8 text-primary-strong" />
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">
              No featured programs yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Admissions has not marked any course as featured. You can still
              browse every batch that is currently accepting students.
            </p>
            <Button
              className="mt-6 min-h-11"
              render={<Link href="/dashboard/enroll" />}
            >
              <CompassIcon />
              Browse open batches
            </Button>
          </div>
        ) : (
          <ul className="space-y-4">
            {featured.map((course, index) => (
              <FeaturedEnrollmentCard
                key={course.id}
                course={course}
                batch={batchByCourseId.get(course.id) ?? null}
                index={index}
                busy={busyId === batchByCourseId.get(course.id)?.id}
                onEnroll={(batch) => {
                  void handleEnroll(batch, course)
                }}
              />
            ))}
          </ul>
        )}
      </section>

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
            onRefresh()
            toast.success(
              'Online payment unlocks class after bank confirmation — no manager review. Manual payments wait for verification.',
            )
          }}
        />
      ) : null}
    </div>
  )
}

const CARD_TONES = [
  'bg-status-pending-bg/70',
  'bg-primary-wash',
  'bg-status-paid-bg/70',
] as const

function FeaturedEnrollmentCard({
  course,
  batch,
  index,
  busy,
  onEnroll,
}: {
  course: Course
  batch: BatchWithSeats | null
  index: number
  busy: boolean
  onEnroll: (batch: BatchWithSeats) => void
}) {
  const canEnroll = Boolean(batch && batch.seatsRemaining > 0)
  const isFull = Boolean(batch && batch.seatsRemaining <= 0)
  const highlights = (course.highlights ?? []).slice(0, 3)
  const tone = CARD_TONES[index % CARD_TONES.length]

  return (
    <li
      className={cn(
        'overflow-hidden rounded-3xl',
        tone,
      )}
    >
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="relative lg:col-span-4">
          <CourseCover
            courseId={course.id}
            title={course.title}
            hasThumbnail={course.hasThumbnail}
            updatedAt={course.updatedAt}
            className="aspect-video w-full lg:aspect-auto lg:h-full lg:min-h-64"
          />
        </div>

        <div className="flex flex-col justify-between gap-6 p-5 sm:p-7 lg:col-span-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {course.category ? (
                <span className="text-xs font-medium tracking-wide text-primary-strong uppercase">
                  {course.category}
                </span>
              ) : (
                <span className="text-xs font-medium tracking-wide text-primary-strong uppercase">
                  Program
                </span>
              )}
              {canEnroll ? (
                <StatusBadge tone="paid" label="Enrollment open" />
              ) : isFull ? (
                <StatusBadge tone="pending" label="Batch full" />
              ) : (
                <StatusBadge tone="neutral" label="No open batch" />
              )}
            </div>

            <div>
              <h3 className="font-heading text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
                {course.title}
                {course.emphasis ? (
                  <>
                    {' '}
                    <em className="font-heading font-medium text-primary italic">
                      {course.emphasis}
                    </em>
                  </>
                ) : null}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {course.tagline?.trim() ||
                  course.focus?.trim() ||
                  course.description?.trim() ||
                  'Open the program page for full details.'}
              </p>
            </div>

            {highlights.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 border-t border-primary/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Entry fee
                </dt>
                <dd className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
                  {formatMoney(
                    batch?.enrollmentFee ?? course.enrollmentFee,
                  )}
                </dd>
              </div>
              {course.billingType === 'monthly' ? (
                <div>
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Monthly
                  </dt>
                  <dd className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
                    {formatMoney(batch?.monthlyFee ?? course.monthlyFee)}
                  </dd>
                </div>
              ) : null}
              {batch ? (
                <div>
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Seats left
                  </dt>
                  <dd className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
                    {batch.seatsRemaining}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                render={<Link href={`/courses/${course.slug}`} />}
              >
                Program details
              </Button>
              {canEnroll && batch ? (
                <Button
                  className="min-h-11"
                  loading={busy}
                  onClick={() => {
                    void onEnroll(batch)
                  }}
                >
                  <CompassIcon />
                  {busy ? 'Enrolling…' : `Enroll & pay · ${batch.name}`}
                </Button>
              ) : (
                <Button
                  className="min-h-11"
                  render={<Link href="/dashboard/enroll" />}
                >
                  <CompassIcon />
                  {isFull ? 'See other batches' : 'Browse batches'}
                </Button>
              )}
            </div>
          </div>

          {batch ? (
            <p className="text-xs text-muted-foreground">
              {batch.name} starts {formatDate(batch.courseStartDate)} ·
              enrollment closes {formatDate(batch.enrollmentClosesAt)}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
